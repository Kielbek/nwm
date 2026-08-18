package app.nwm.server.config;

import java.net.URI;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * The S3 client is built against {@code app.storage.endpoint}, which points
 * at MinIO in local/docker-compose development and can be swapped for the
 * real AWS S3 endpoint (or left unset to use it) in production — the same
 * code path works against both since MinIO speaks the S3 API.
 */
@Configuration
public class S3Config {

  @Bean
  public S3Client s3Client(AppProperties properties) {
    AppProperties.Storage storage = properties.storage();
    return S3Client.builder()
        .endpointOverride(URI.create(storage.endpoint()))
        .region(Region.of(storage.region()))
        .credentialsProvider(credentialsProvider(storage))
        .serviceConfiguration(
            S3Configuration.builder().pathStyleAccessEnabled(storage.pathStyleAccess()).build())
        // A hung S3/MinIO connection shouldn't be able to hang a request thread
        // indefinitely — bound both the whole call and a single attempt.
        .overrideConfiguration(
            ClientOverrideConfiguration.builder()
                .apiCallTimeout(Duration.ofSeconds(30))
                .apiCallAttemptTimeout(Duration.ofSeconds(10))
                .build())
        .build();
  }

  @Bean
  public S3Presigner s3Presigner(AppProperties properties) {
    AppProperties.Storage storage = properties.storage();
    // Presigned URLs are handed straight to the browser, so they must point
    // at an endpoint the browser can actually reach — publicEndpoint, not
    // the (possibly Docker-internal, e.g. "minio") endpoint the app/worker
    // use for their own S3 calls. The signature itself is still computed
    // against the real bucket/region/credentials, so this only changes the
    // host in the URL, not what it's allowed to access.
    return S3Presigner.builder()
        .endpointOverride(URI.create(storage.publicEndpoint()))
        .region(Region.of(storage.region()))
        .credentialsProvider(credentialsProvider(storage))
        .serviceConfiguration(
            S3Configuration.builder().pathStyleAccessEnabled(storage.pathStyleAccess()).build())
        .build();
  }

  private StaticCredentialsProvider credentialsProvider(AppProperties.Storage storage) {
    return StaticCredentialsProvider.create(
        AwsBasicCredentials.create(storage.accessKey(), storage.secretKey()));
  }
}
