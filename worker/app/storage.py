"""S3 upload helper — works against real AWS S3 or the MinIO instance
already used by docker-compose.yml, same as the Java server's storage
config.
"""

from __future__ import annotations

import boto3
from botocore.client import Config as BotoConfig

from .config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(
                s3={"addressing_style": "path" if settings.s3_path_style_access else "virtual"}
            ),
        )
    return _client


def upload_audio(bucket: str, key: str, data: bytes, content_type: str) -> None:
    get_client().put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
