"""XTTS v2 inference: chunk the job's text, synthesize each chunk, stitch
the results into one file in the requested output format.

The `TTS` import is deliberately deferred to inside `_load_model()` — it
pulls in torch, which is slow to import and completely unnecessary for
anything that doesn't actually run inference (unit tests, message
parsing, etc).
"""

from __future__ import annotations

import io
import logging
import tempfile
from pathlib import Path

from .config import settings
from .language import detect_language
from .models import TtsJob
from .text_chunking import chunk_text
from .voices import get_voice_profile

logger = logging.getLogger(__name__)

_model = None

# modelId from the frontend's model picker (expressive/standard/fast/draft)
# maps to XTTS inference knobs rather than genuinely different engines —
# XTTS v2 is the only model here.
_MODEL_TUNING = {
    "expressive": {"temperature": 0.85, "repetition_penalty": 2.0},
    "standard": {"temperature": 0.65, "repetition_penalty": 2.0},
    "fast": {"temperature": 0.5, "repetition_penalty": 1.5},
    "draft": {"temperature": 0.3, "repetition_penalty": 1.0},
}

_OUTPUT_FORMATS = {
    "mp3-128": {"format": "mp3", "bitrate": "128k", "extension": "mp3"},
    "mp3-192": {"format": "mp3", "bitrate": "192k", "extension": "mp3"},
    "wav": {"format": "wav", "bitrate": None, "extension": "wav"},
    "ogg": {"format": "ogg", "bitrate": None, "extension": "ogg"},
}

_SILENCE_BETWEEN_CHUNKS_MS = 180


def _load_model():
    global _model
    if _model is None:
        from TTS.api import TTS  # noqa: PLC0415 — see module docstring

        logger.info(
            "Loading XTTS model '%s' on device '%s' (first load downloads "
            "~2GB of weights — this can take a while)...",
            settings.xtts_model_name,
            settings.xtts_device,
        )
        _model = TTS(settings.xtts_model_name).to(settings.xtts_device)
    return _model


def synthesize(job: TtsJob) -> tuple[bytes, float, str]:
    """Returns (audio_bytes, duration_seconds, file_extension)."""
    from pydub import AudioSegment  # noqa: PLC0415 — only needed for real synthesis

    model = _load_model()
    voice = get_voice_profile(job.voice_id)
    language = detect_language(job.text, default=settings.default_language)
    tuning = _MODEL_TUNING.get(job.model_id, _MODEL_TUNING["standard"])
    speed = max(0.5, min(2.0, job.settings.speed))

    chunks = chunk_text(job.text, max_chars=settings.max_chunk_chars)
    if not chunks:
        raise ValueError("No synthesizable text after chunking")

    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=_SILENCE_BETWEEN_CHUNKS_MS)

    with tempfile.TemporaryDirectory() as tmp_dir:
        for i, chunk in enumerate(chunks):
            chunk_path = Path(tmp_dir) / f"chunk_{i}.wav"
            model.tts_to_file(
                text=chunk,
                speaker_wav=str(voice.reference_wav),
                language=language,
                speed=speed,
                temperature=tuning["temperature"],
                repetition_penalty=tuning["repetition_penalty"],
                file_path=str(chunk_path),
            )
            combined += AudioSegment.from_wav(chunk_path)
            if i < len(chunks) - 1:
                combined += silence

    output = _OUTPUT_FORMATS.get(job.output_format, _OUTPUT_FORMATS["mp3-128"])
    buffer = io.BytesIO()
    export_kwargs = {"format": output["format"]}
    if output["bitrate"]:
        export_kwargs["bitrate"] = output["bitrate"]
    combined.export(buffer, **export_kwargs)

    duration_seconds = round(len(combined) / 1000, 2)
    return buffer.getvalue(), duration_seconds, output["extension"]
