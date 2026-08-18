# NWM TTS worker

The Python worker that actually synthesizes speech. The Spring server
(`../server`) never talks to a TTS engine directly — it authenticates
users, enforces quotas, and hands off jobs over RabbitMQ; this service
consumes those jobs, runs [Coqui XTTS v2](https://github.com/idiap/coqui-ai-TTS)
locally, uploads the result to S3/MinIO, and reports back.

## ⚠️ License warning — read before charging money for this

XTTS v2's **code** is MPL-2.0 (fine commercially). Its **model weights**
are released under the **Coqui Public Model License (CPML)**, which
permits **non-commercial use only**. Coqui Inc., the company that could
sell a commercial license, shut down in January 2024 — there is currently
no legitimate way to buy commercial rights to these weights.

This worker is built on XTTS v2 anyway, as a deliberate, informed
tradeoff for now (early build, no real revenue yet) — **not** because the
licensing issue doesn't apply. Before this product actually charges
users, swap the synthesis engine for one of:

- **Piper** (MIT) — has real PL/DE/EN voice packs, no licensing risk, but
  no voice cloning (fixed voices per language instead of cloned personas).
- **A paid commercial API** (Azure AI Speech, Google Cloud TTS) — unlocks
  real voice cloning again via e.g. Azure Custom Neural Voice, at the
  cost of a per-character bill and vendor lock-in.

Don't let this comment go stale — if you're reading this while the app
has a live Stripe subscription, that's the sign it's overdue.

## Architecture

```
Spring server ──(tts.generate.requests)──▶ this worker
                                              │
                                              ├─ chunk text (text_chunking.py)
                                              ├─ synthesize chunk 0 (XTTS, synthesis.py) ─▶ upload ─▶ publish (tts.generate.chunks) ─┐
                                              ├─ synthesize chunk 1                       ─▶ upload ─▶ publish (tts.generate.chunks) ─┤
                                              ├─ ...                                                                                  ├─▶ Spring server
                                              ├─ stitch all chunks into one combined file                                             │   (SSE to browser
                                              ├─ upload combined file to S3/MinIO (storage.py)                                        │    as each arrives)
                                              │
Spring server ◀──(tts.generate.results, combined file)────────────────────────────────────────────────────────────────────────────┘
```

Chunks are published **as each one finishes**, not batched — this is what
lets the frontend start playing audio before a long job's later chunks
(or the final combined file) are even done synthesizing. The combined
file is still produced and published at the end via `tts.generate.results`
exactly as before, so the "download the whole thing" / history-replay
path is unaffected.

### Message contract

Mirrors `server/src/main/java/app/nwm/server/tts/messaging/dto/` — keep
both sides in sync if either changes.

**Consumes** `tts.generate.requests`:

```json
{
  "jobId": "uuid",
  "text": "...",
  "voiceId": "marek",
  "modelId": "standard",
  "outputFormat": "mp3-128",
  "settings": { "speed": 1.0, "stability": 0.5, "similarity": 0.85, "styleExaggeration": 0.0, "languageOverride": false },
  "s3Bucket": "nwm-audio",
  "resultObjectKeyPrefix": "generations/<userId>"
}
```

**Publishes** to `tts.generate.chunks` — routing key `tts.chunk` — once
per text segment, as soon as that segment is synthesized and uploaded:

```json
{
  "jobId": "uuid",
  "chunkIndex": 0,
  "totalChunks": 3,
  "audioS3Key": "generations/<userId>/<jobId>/chunk-0.mp3",
  "durationSeconds": 4.2
}
```

**Publishes** to `tts.generate.results` — routing key `tts.result` — once,
after every chunk is done and the combined file is uploaded:

```json
{
  "jobId": "uuid",
  "status": "COMPLETED",
  "audioS3Key": "generations/<userId>/<jobId>.mp3",
  "durationSeconds": 4.2,
  "errorMessage": null
}
```

Both go **through the `tts.exchange` exchange with their routing key**,
never sent to a queue name directly (see `RabbitMqConfig.java` — each
queue is bound to the exchange under its routing key, so a direct-to-queue
publish is silently dropped).

### Text chunking

XTTS's prosody degrades on long single calls, so long input text is split
on sentence boundaries into ≤`XTTS_MAX_CHUNK_CHARS` (default 250) pieces,
synthesized individually, and concatenated with a short silence between
them (`text_chunking.py` + `synthesis.py`). This is why generation for a
long piece of text visibly takes proportionally longer — it's doing N
small synthesis calls, not one big one.

### Language

XTTS v2 supports 17 languages (see `language.py`). There's no explicit
language field in the job message yet (`settings.languageOverride` is
currently just a UI toggle with nothing behind it) — this worker
auto-detects the language from the text itself via `langdetect` and falls
back to `DEFAULT_LANGUAGE` when detection fails or lands on an
unsupported language.

**English accents are not a language setting in XTTS** — it has one
`en`. A distinct accent has to come from the *reference voice sample*
used for cloning, so "many English accents" means registering separate
English reference voices (see `voices/README.md`), not a locale code.

### Voices

`voices.py` maps the frontend's fixed voice IDs (`marek`, `ania`, `kuba`,
`zosia`, `tomasz`) to reference `.wav` samples in `voices/` — see
`voices/README.md` for recording requirements. No sample files ship in
this repo; you need to record/license them yourself.

## Running locally

```bash
cd worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt   # pulls torch — this is a large download
cp .env.example .env              # fill in real values, matching server/.env
# add at least one voices/<id>.wav (see voices/README.md)

python -m app.main
```

Requires `ffmpeg` on PATH (`apt install ffmpeg` / `brew install ffmpeg`)
for pydub's mp3/ogg export.

First run downloads ~2GB of XTTS weights into `~/.local/share/tts` —
expect a real pause. CPU inference works but is slow (tens of seconds per
chunk); set `XTTS_DEVICE=cuda` if you have a usable NVIDIA GPU.

## Running via Docker

```bash
cd worker
docker build -t nwm-worker .
docker run --env-file .env nwm-worker
```

For the full stack (`server/docker-compose.yml`), start this alongside
it manually for now — it isn't wired into that compose file by default
since it needs its own real voice samples and (ideally) GPU access before
it's useful, which the rest of the stack doesn't require.

## Testing

```bash
pip install pytest
pytest tests/
```

The tests only cover the pure-Python pieces (chunking, language mapping)
— they deliberately avoid importing `synthesis.py`'s XTTS path, since
that requires the full torch/coqui-tts install and real model weights.

### Manual integration test (no Spring needed)

`tests/_setup_topology.py`, `_publish_fake_job.py`, `_consume_chunks.py`, and
`_consume_result.py` are one-off scripts (not pytest tests — hence the
leading underscore) that exercise the real RabbitMQ contract without
needing the Spring server running at all. Useful to sanity-check the
worker in isolation, or to narrow down whether a bug is in this worker or
in the Spring side:

```bash
# with RabbitMQ running and RABBITMQ_* env vars exported to match it
python tests/_setup_topology.py          # declares tts.exchange/queues, same as RabbitMqConfig.java
python tests/_publish_fake_job.py "some text to synthesize"
python -m app.main                       # in another terminal — processes the job
python tests/_consume_chunks.py          # prints every message that landed on tts.generate.chunks
python tests/_consume_result.py          # prints whatever landed on tts.generate.results
```

This is exactly how the worker's RabbitMQ wiring (exchange, routing keys,
message shapes) was verified while building it — including that a
synthesis failure correctly round-trips a `FAILED` result back through
the same exchange, not just success. It does *not* verify the S3 upload
target is real (point `S3_ENDPOINT` at an actual MinIO/S3 for that) or
that XTTS itself produces audio (needs the real model weights).
