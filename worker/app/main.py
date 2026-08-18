"""Entry point: consumes tts.generate.requests, synthesizes with XTTS,
uploads the result to S3, and publishes the outcome back to
tts.generate.results.
"""

from __future__ import annotations

import json
import logging
import signal
import sys
from typing import Any

import pika

from .config import settings
from .messaging import build_connection, publish_chunk, publish_result
from .models import TtsChunkResult, TtsJob, TtsResult
from .storage import upload_audio
from .synthesis import ChunkSynthesizer

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
logger = logging.getLogger("nwm.worker")

_CONTENT_TYPES = {"mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg"}


def handle_message(
    channel: pika.channel.Channel,
    method: pika.spec.Basic.Deliver,
    _properties: pika.spec.BasicProperties,
    body: bytes,
) -> None:
    try:
        payload: dict[str, Any] = json.loads(body)
        job = TtsJob.from_message(payload)
    except Exception:
        # A message we can't even parse can never succeed on retry either —
        # ack it away instead of looping forever, and log it loudly so it's
        # not silently lost.
        logger.exception("Discarding unparsable message: %s", body[:500])
        channel.basic_ack(delivery_tag=method.delivery_tag)
        return

    logger.info(
        "Processing job %s (%d chars, voice=%s, model=%s)",
        job.job_id,
        len(job.text),
        job.voice_id,
        job.model_id,
    )

    try:
        synthesizer = ChunkSynthesizer(job)
        for chunk in synthesizer.chunks():
            chunk_key = f"{job.result_object_key_prefix}/{job.job_id}/chunk-{chunk.index}.{chunk.extension}"
            upload_audio(
                job.s3_bucket,
                chunk_key,
                chunk.audio_bytes,
                _CONTENT_TYPES.get(chunk.extension, "application/octet-stream"),
            )
            publish_chunk(
                channel,
                TtsChunkResult(
                    job.job_id, chunk.index, chunk.total, chunk_key, chunk.duration_seconds
                ).to_message(),
            )

        audio_bytes, duration_seconds, extension = synthesizer.combined()
        key = f"{job.result_object_key_prefix}/{job.job_id}.{extension}"
        upload_audio(
            job.s3_bucket,
            key,
            audio_bytes,
            _CONTENT_TYPES.get(extension, "application/octet-stream"),
        )
        result = TtsResult.completed(job.job_id, key, duration_seconds)
    except Exception as exc:  # noqa: BLE001 — job failures must always produce a result message
        logger.exception("Job %s failed", job.job_id)
        result = TtsResult.failed(job.job_id, str(exc))

    publish_result(channel, result.to_message())
    channel.basic_ack(delivery_tag=method.delivery_tag)


def main() -> None:
    logger.info("Connecting to RabbitMQ at %s:%s...", settings.rabbitmq_host, settings.rabbitmq_port)
    connection = build_connection()
    channel = connection.channel()
    channel.basic_qos(prefetch_count=settings.prefetch_count)
    channel.basic_consume(queue=settings.tts_request_queue, on_message_callback=handle_message)

    def _shutdown(signum, _frame):
        logger.info("Received signal %s, shutting down...", signum)
        channel.stop_consuming()
        connection.close()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("Listening on queue '%s'...", settings.tts_request_queue)
    channel.start_consuming()


if __name__ == "__main__":
    main()
