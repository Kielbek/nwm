"""Consumes exactly one message from tts.generate.results to verify what
the worker actually published, matching TtsResultConsumer.java's contract.
"""

import json

import pika

credentials = pika.PlainCredentials("nwm", "nwm12345")
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="127.0.0.1", port=5672, credentials=credentials)
)
channel = connection.channel()

method, properties, body = channel.basic_get(queue="tts.generate.results", auto_ack=True)
if method is None:
    print("No message waiting on tts.generate.results")
else:
    print("content_type:", properties.content_type)
    print("body:", json.dumps(json.loads(body), indent=2, ensure_ascii=False))

connection.close()
