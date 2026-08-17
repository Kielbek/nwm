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
        heartbeat=30,
        blocked_connection_timeout=30,
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
