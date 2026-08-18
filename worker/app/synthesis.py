"""XTTS v2 inference: chunk the job's text and synthesize each chunk.

`ChunkSynthesizer.chunks()` yields each segment's audio as soon as it's
ready (already exported to the requested output format) so the caller can
upload + publish it immediately — this is what lets the frontend start
playback before a long job finishes. After the generator is exhausted,
`ChunkSynthesizer.combined()` stitches the same segments into one file,
same as the old single-shot `synthesize()` used to produce, so the
existing "whole job" download/history behavior is unchanged.

The `TTS` import is deliberately deferred to inside `_load_model()` — it
pulls in torch, which is slow to import and completely unnecessary for
anything that doesn't actually run inference (unit tests, message
parsing, etc).
"""

from __future__ import annotations

import io
import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Iterator

from .config import settings
from .language import detect_language
from .models import TtsJob
from .text_chunking import chunk_text
from .voices import get_voice_profile

if TYPE_CHECKING:
    from pydub import AudioSegment

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


@dataclass(frozen=True)
class SynthesizedChunk:
    index: int
    total: int
    audio_bytes: bytes
    duration_seconds: float
    extension: str


class ChunkSynthesizer:
    """One instance per job. Call `chunks()` and fully exhaust it before
    calling `combined()` — `combined()` stitches together the segments
    `chunks()` collected along the way, it doesn't re-run inference.
    """

    def __init__(self, job: TtsJob):
        self._job = job
        self._output = _OUTPUT_FORMATS.get(job.output_format, _OUTPUT_FORMATS["mp3-128"])
        self._segments: list["AudioSegment"] = []

    def chunks(self) -> Iterator[SynthesizedChunk]:
        model = _load_model()
        voice = get_voice_profile(self._job.voice_id)
        language = detect_language(self._job.text, default=settings.default_language)
        tuning = _MODEL_TUNING.get(self._job.model_id, _MODEL_TUNING["standard"])
        speed = max(0.5, min(2.0, self._job.settings.speed))

        text_chunks = chunk_text(self._job.text, max_chars=settings.max_chunk_chars)
        if not text_chunks:
            raise ValueError("No synthesizable text after chunking")

        from pydub import AudioSegment  # noqa: PLC0415 — only needed for real synthesis

        with tempfile.TemporaryDirectory() as tmp_dir:
            for i, text_chunk in enumerate(text_chunks):
                chunk_path = Path(tmp_dir) / f"chunk_{i}.wav"
                model.tts_to_file(
                    text=text_chunk,
                    speaker_wav=str(voice.reference_wav),
                    language=language,
                    speed=speed,
                    temperature=tuning["temperature"],
                    repetition_penalty=tuning["repetition_penalty"],
                    file_path=str(chunk_path),
                )
                segment = AudioSegment.from_wav(chunk_path)
                self._segments.append(segment)

                buffer = io.BytesIO()
                segment.export(buffer, **self._export_kwargs())
                yield SynthesizedChunk(
                    index=i,
                    total=len(text_chunks),
                    audio_bytes=buffer.getvalue(),
                    duration_seconds=round(len(segment) / 1000, 2),
                    extension=self._output["extension"],
                )

    def combined(self) -> tuple[bytes, float, str]:
        from pydub import AudioSegment  # noqa: PLC0415 — only needed for real synthesis

        if not self._segments:
            raise ValueError("combined() called before chunks() produced any audio")

        combined = AudioSegment.empty()
        silence = AudioSegment.silent(duration=_SILENCE_BETWEEN_CHUNKS_MS)
        for i, segment in enumerate(self._segments):
            combined += segment
            if i < len(self._segments) - 1:
                combined += silence

        buffer = io.BytesIO()
        combined.export(buffer, **self._export_kwargs())
        duration_seconds = round(len(combined) / 1000, 2)
        return buffer.getvalue(), duration_seconds, self._output["extension"]

    def _export_kwargs(self) -> dict:
        kwargs = {"format": self._output["format"]}
        if self._output["bitrate"]:
            kwargs["bitrate"] = self._output["bitrate"]
        return kwargs
