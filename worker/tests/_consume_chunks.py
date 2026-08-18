"""Drains tts.generate.chunks to verify what the worker published for each
segment, matching TtsChunkConsumer.java's contract. Run alongside (or
before) _consume_result.py — chunks arrive first, the final result last.
"""

import json

import pika

credentials = pika.PlainCredentials("nwm", "nwm12345")
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="127.0.0.1", port=5672, credentials=credentials)
)
channel = connection.channel()

count = 0
while True:
    method, properties, body = channel.basic_get(queue="tts.generate.chunks", auto_ack=True)
    if method is None:
        break
    count += 1
    print(f"--- chunk message {count} ---")
    print("body:", json.dumps(json.loads(body), indent=2, ensure_ascii=False))

if count == 0:
    print("No messages waiting on tts.generate.chunks")

connection.close()
