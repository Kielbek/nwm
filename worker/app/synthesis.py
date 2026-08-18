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

# There's only one voice model (XTTS v2) and no style/model picker in the
# UI — an earlier speaking-style preset selector didn't produce a clear
# enough difference in practice to justify keeping it, so `model_id` from
# the job message is currently ignored and every job uses this one baseline
# tuning. Real differentiation between voices should come from the quality
# of each voice's reference sample (see voices.py), not from these knobs.
_BASE_TEMPERATURE = 0.55
_BASE_REPETITION_PENALTY = 1.8
_BASE_TOP_P = 0.8

# Frontend settings sliders (stability/similarity/styleExaggeration), 0-1,
# mapped onto real XTTS inference knobs — nudging around the baseline above
# rather than replacing it:
#
# - stability: ElevenLabs-style semantics (low = more variable/expressive,
#   high = more consistent/monotone) — nudges `temperature` down as
#   stability increases.
# - styleExaggeration: widens sampling diversity via `top_p` as it increases.
# - similarity: XTTS has no direct "voice similarity" knob — cloning
#   fidelity comes from how much of the reference clip it conditions on
#   (`gpt_cond_len`, seconds), so more similarity = use more of the
#   reference sample for conditioning.
_STABILITY_TEMPERATURE_SWING = 0.5
_STYLE_TOP_P_SWING = 0.15
_MIN_GPT_COND_LEN_SECONDS = 3
_MAX_GPT_COND_LEN_SECONDS = 30


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))

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
        speed = max(0.5, min(2.0, self._job.settings.speed))

        stability = _clamp(self._job.settings.stability, 0.0, 1.0)
        style_exaggeration = _clamp(self._job.settings.style_exaggeration, 0.0, 1.0)
        similarity = _clamp(self._job.settings.similarity, 0.0, 1.0)

        # stability=0 -> +swing/2 (more variable than the baseline),
        # stability=1 -> -swing/2 (more consistent than the baseline).
        temperature = _clamp(
            _BASE_TEMPERATURE + (0.5 - stability) * _STABILITY_TEMPERATURE_SWING, 0.05, 1.0
        )
        top_p = _clamp(_BASE_TOP_P + (style_exaggeration - 0.5) * _STYLE_TOP_P_SWING, 0.3, 1.0)
        gpt_cond_len = round(
            _MIN_GPT_COND_LEN_SECONDS
            + similarity * (_MAX_GPT_COND_LEN_SECONDS - _MIN_GPT_COND_LEN_SECONDS)
        )

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
                    temperature=temperature,
                    repetition_penalty=_BASE_REPETITION_PENALTY,
                    top_p=top_p,
                    gpt_cond_len=gpt_cond_len,
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
