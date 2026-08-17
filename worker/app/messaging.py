"""RabbitMQ connection helpers matching the contract declared in
server/src/main/java/app/nwm/server/config/RabbitMqConfig.java.

Important: results are published through the exchange with the RESULT
routing key, not sent directly to the result queue's name. RabbitMqConfig
binds `tts.generate.results` to `tts.exchange` under routing key
`tts.result` — publishing straight to the queue name bypasses that
binding and the message is silently dropped.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import pika
import pika.channel

from .config import settings

logger = logging.getLogger(__name__)


def build_connection() -> pika.BlockingConnection:
    credentials = pika.PlainCredentials(settings.rabbitmq_username, settings.rabbitmq_password)
    parameters = pika.ConnectionParameters(
        host=settings.rabbitmq_host,
        port=settings.rabbitmq_port,
        credentials=credentials,
        # This worker is single-threaded and synchronous: while
        # synthesize() is running (which can legitimately take minutes on
        # CPU), pika's BlockingConnection has no opportunity to send/reply
        # to heartbeat frames. A short heartbeat (pika's own default is
        # 60s) makes RabbitMQ kill the connection mid-job — the failure
        # only surfaces later, confusingly, when publish_result() tries to
        # use the now-dead connection. Set generously above the longest
        # realistic job duration rather than disabling heartbeats
        # entirely (0), which would stop detecting truly dead connections.
        heartbeat=3600,
        blocked_connection_timeout=300,
    )
    return pika.BlockingConnection(parameters)


def publish_result(channel: pika.channel.Channel, result: dict[str, Any]) -> None:
    channel.basic_publish(
        exchange=settings.tts_exchange,
        routing_key=settings.tts_result_routing_key,
        body=json.dumps(result).encode("utf-8"),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
    )
    logger.info("Published result for job %s (%s)", result.get("jobId"), result.get("status"))
