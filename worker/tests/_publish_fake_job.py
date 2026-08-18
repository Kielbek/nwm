"""Publishes a job exactly as TtsRequestProducer.java would, to prove the
worker consumes real Spring-shaped messages correctly."""

import json
import sys
import uuid

import pika

job_id = str(uuid.uuid4())
text = sys.argv[1] if len(sys.argv) > 1 else "Cześć, to jest testowa wiadomość do syntezy mowy."

message = {
    "jobId": job_id,
    "text": text,
    "voiceId": "marek",
    "modelId": "natural",
    "outputFormat": "mp3-128",
    "settings": {
        "speed": 1.0,
        "stability": 0.5,
        "similarity": 0.85,
        "styleExaggeration": 0.0,
        "languageOverride": False,
    },
    "s3Bucket": "nwm-audio",
    "resultObjectKeyPrefix": "generations/test-user",
}

credentials = pika.PlainCredentials("nwm", "nwm12345")
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host="127.0.0.1", port=5672, credentials=credentials)
)
channel = connection.channel()
channel.basic_publish(
    exchange="tts.exchange",
    routing_key="tts.request",
    body=json.dumps(message).encode("utf-8"),
    properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
)
connection.close()

print(f"Published job {job_id}")
print(job_id)
