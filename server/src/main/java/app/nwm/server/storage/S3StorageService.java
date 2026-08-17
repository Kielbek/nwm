package app.nwm.server.storage;

import app.nwm.server.config.AppProperties;
import java.net.URL;
import java.time.Duration;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

@Service
public class S3StorageService {

  private final S3Client s3Client;
  private final S3Presigner s3Presigner;
  private final AppProperties.Storage storage;

  public S3StorageService(S3Client s3Client, S3Presigner s3Presigner, AppProperties properties) {
    this.s3Client = s3Client;
    this.s3Presigner = s3Presigner;
    this.storage = properties.storage();
  }

  /** Time-limited download link for a generated audio file — never expose the bucket publicly. */
  public URL presignDownloadUrl(String objectKey) {
    GetObjectRequest getRequest =
        GetObjectRequest.builder().bucket(storage.bucket()).key(objectKey).build();

    GetObjectPresignRequest presignRequest =
        GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(storage.presignTtlMinutes()))
            .getObjectRequest(getRequest)
            .build();

    return s3Presigner.presignGetObject(presignRequest).url();
  }

  public boolean exists(String objectKey) {
    try {
      s3Client.headObject(
          HeadObjectRequest.builder().bucket(storage.bucket()).key(objectKey).build());
      return true;
    } catch (NoSuchKeyException e) {
      return false;
    } catch (S3Exception e) {
      if (e.statusCode() == 404) {
        return false;
      }
      throw e;
    }
  }
}
