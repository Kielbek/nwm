package app.nwm.server.storage;

import app.nwm.server.config.AppProperties;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

/** Cheap connectivity check against the configured bucket — surfaces a broken S3/MinIO endpoint at /actuator/health rather than only on the next upload/download attempt. */
@Component
public class S3HealthIndicator implements HealthIndicator {

  private final S3Client s3Client;
  private final String bucket;

  public S3HealthIndicator(S3Client s3Client, AppProperties properties) {
    this.s3Client = s3Client;
    this.bucket = properties.storage().bucket();
  }

  @Override
  public Health health() {
    try {
      s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
      return Health.up().withDetail("bucket", bucket).build();
    } catch (RuntimeException e) {
      return Health.down(e).withDetail("bucket", bucket).build();
    }
  }
}
