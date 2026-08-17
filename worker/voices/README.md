# Reference voice samples

XTTS clones a voice from a short reference recording — it has no fixed
voice bank of its own. Every voice the frontend offers has to have a real
`.wav` sample here, named after its voice ID:

```
voices/
  marek.wav
  ania.wav
  kuba.wav
  zosia.wav
  tomasz.wav
```

(IDs come from `src/app/core/services/voice-library.service.ts` in the
Angular app — keep them in sync if that list changes.)

## Recording requirements

- **Length:** 6–30 seconds of continuous, clean speech. Longer isn't
  better past ~15s — pick a clip with natural pacing and varied
  intonation, not a monotone read.
- **Format:** mono, 16-bit PCM WAV, ideally 22050 Hz or 24000 Hz sample
  rate (XTTS resamples anyway, but starting clean helps).
- **Content:** no background music, noise, reverb, or overlapping
  speakers. A quiet room and a decent mic beat a loud one and a great mic.
- **Consent/licensing:** whoever's voice this is needs to have actually
  agreed to having it cloned and used in this product — this isn't
  optional, voice cloning without consent is both an ethical and (in a
  growing number of jurisdictions) legal problem.

## Missing samples

If a voice ID has no matching `.wav` here, `app/voices.py` falls back to
whichever sample IS present rather than hard-failing the job — so the
worker stays usable while you're still recording/licensing the full set,
but every fallback job will sound like the wrong voice until its real
sample is added.
