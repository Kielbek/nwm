"""Environment-driven settings. Defaults mirror the values already used by
the Spring server's docker-compose.yml so the two services can share one
.env in local dev.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Loads worker/.env into the process environment. Resolved explicitly
# relative to this file (not left to load_dotenv()'s own cwd/call-stack
# guessing, which has proven unreliable depending on how the process is
# launched) — this file is worker/app/config.py, so its grandparent is
# worker/, where .env actually lives. Does nothing (silently) if the file
# doesn't exist, e.g. in Docker where real env vars are passed in directly
# via --env-file / docker-compose instead.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _env_int(name: str, default: int) -> int:
    return int(os.environ.get(name, str(default)))


def _env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    rabbitmq_host: str
    rabbitmq_port: int
    rabbitmq_username: str
    rabbitmq_password: str

    tts_exchange: str
    tts_request_queue: str
    tts_result_routing_key: str

    s3_endpoint: str
    s3_region: str
    s3_bucket: str
    s3_access_key: str
    s3_secret_key: str
    s3_path_style_access: bool

    voices_dir: Path
    xtts_model_name: str
    xtts_device: str
    max_chunk_chars: int
    default_language: str
    prefetch_count: int


def load_settings() -> Settings:
    return Settings(
        rabbitmq_host=_env("RABBITMQ_HOST", "localhost"),
        rabbitmq_port=_env_int("RABBITMQ_PORT", 5672),
        rabbitmq_username=_env("RABBITMQ_USERNAME", "nwm"),
        rabbitmq_password=_env("RABBITMQ_PASSWORD", "nwm"),
        # Must match RabbitMqConfig.java on the server: publishing straight to
        # the queue name (instead of through this exchange + routing key)
        # will silently fail to route the result back.
        tts_exchange=_env("TTS_EXCHANGE", "tts.exchange"),
        tts_request_queue=_env("TTS_REQUEST_QUEUE", "tts.generate.requests"),
        tts_result_routing_key=_env("TTS_RESULT_ROUTING_KEY", "tts.result"),
        s3_endpoint=_env("S3_ENDPOINT", "http://localhost:9000"),
        s3_region=_env("S3_REGION", "us-east-1"),
        s3_bucket=_env("S3_BUCKET", "nwm-audio"),
        s3_access_key=_env("S3_ACCESS_KEY", "nwm"),
        s3_secret_key=_env("S3_SECRET_KEY", "nwm12345"),
        s3_path_style_access=_env_bool("S3_PATH_STYLE_ACCESS", True),
        voices_dir=Path(_env("VOICES_DIR", str(Path(__file__).resolve().parent.parent / "voices"))),
        xtts_model_name=_env("XTTS_MODEL_NAME", "tts_models/multilingual/multi-dataset/xtts_v2"),
        xtts_device=_env("XTTS_DEVICE", "cpu"),
        # XTTS's own docs recommend keeping each call short (~200-250 chars)
        # for stable prosody — longer inputs tend to drift or truncate.
        max_chunk_chars=_env_int("XTTS_MAX_CHUNK_CHARS", 250),
        default_language=_env("DEFAULT_LANGUAGE", "pl"),
        prefetch_count=_env_int("WORKER_PREFETCH_COUNT", 1),
    )


settings = load_settings()
