"""One-off script (not a pytest test): declares the exact same RabbitMQ
topology as server/.../RabbitMqConfig.java, so the worker can be tested
against something that behaves like the real Spring app without needing
Spring itself running.
"""

import pika

credentials = pika.PlainCredentials("nwm", "nwm12345")
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="127.0.0.1", port=5672, credentials=credentials)
)
channel = connection.channel()

channel.exchange_declare(exchange="tts.exchange", exchange_type="direct", durable=True)

channel.queue_declare(
    queue="tts.generate.requests",
    durable=True,
    arguments={
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": "tts.generate.dlq",
    },
)
channel.queue_declare(queue="tts.generate.results", durable=True)
channel.queue_declare(queue="tts.generate.dlq", durable=True)

channel.queue_bind(queue="tts.generate.requests", exchange="tts.exchange", routing_key="tts.request")
channel.queue_bind(queue="tts.generate.results", exchange="tts.exchange", routing_key="tts.result")

print("Topology declared: tts.exchange, tts.generate.requests, tts.generate.results, tts.generate.dlq")
connection.close()
