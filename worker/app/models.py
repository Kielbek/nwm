"""Python mirrors of the Java DTOs in
server/src/main/java/app/nwm/server/tts/messaging/dto/ — keep field names
in sync with TtsJobMessage / TtsResultMessage, they're the cross-language
contract.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class TtsSettings:
    speed: float
    stability: float
    similarity: float
    style_exaggeration: float
    language_override: bool


@dataclass(frozen=True)
class TtsJob:
    job_id: str
    text: str
    voice_id: str
    model_id: str
    output_format: str
    settings: TtsSettings
    s3_bucket: str
    result_object_key_prefix: str

    @staticmethod
    def from_message(body: dict[str, Any]) -> "TtsJob":
        raw_settings = body.get("settings") or {}
        return TtsJob(
            job_id=body["jobId"],
            text=body["text"],
            voice_id=body["voiceId"],
            model_id=body["modelId"],
            output_format=body["outputFormat"],
            settings=TtsSettings(
                speed=float(raw_settings.get("speed", 1.0)),
                stability=float(raw_settings.get("stability", 0.5)),
                similarity=float(raw_settings.get("similarity", 0.85)),
                style_exaggeration=float(raw_settings.get("styleExaggeration", 0.0)),
                language_override=bool(raw_settings.get("languageOverride", False)),
            ),
            s3_bucket=body["s3Bucket"],
            result_object_key_prefix=body["resultObjectKeyPrefix"],
        )


@dataclass(frozen=True)
class TtsChunkResult:
    job_id: str
    chunk_index: int
    total_chunks: int
    audio_s3_key: str
    duration_seconds: float

    def to_message(self) -> dict[str, Any]:
        return {
            "jobId": self.job_id,
            "chunkIndex": self.chunk_index,
            "totalChunks": self.total_chunks,
            "audioS3Key": self.audio_s3_key,
            "durationSeconds": self.duration_seconds,
        }


@dataclass(frozen=True)
class TtsResult:
    job_id: str
    status: str  # "COMPLETED" | "FAILED"
    audio_s3_key: Optional[str]
    duration_seconds: Optional[float]
    error_message: Optional[str]

    def to_message(self) -> dict[str, Any]:
        return {
            "jobId": self.job_id,
            "status": self.status,
            "audioS3Key": self.audio_s3_key,
            "durationSeconds": self.duration_seconds,
            "errorMessage": self.error_message,
        }

    @staticmethod
    def completed(job_id: str, audio_s3_key: str, duration_seconds: float) -> "TtsResult":
        return TtsResult(job_id, "COMPLETED", audio_s3_key, duration_seconds, None)

    @staticmethod
    def failed(job_id: str, error_message: str) -> "TtsResult":
        return TtsResult(job_id, "FAILED", None, None, error_message[:500])
