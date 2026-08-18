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
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

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

  /**
   * Fetches an object's bytes directly (server-to-server, no CORS
   * involved) — used to proxy downloads through this API instead of
   * handing the browser a presigned URL. A presigned URL's {@code
   * download} attribute is silently ignored by browsers for cross-origin
   * resources (which the storage endpoint always is, e.g. the
   * Docker-internal "minio" host), so clicking "download" just opened/
   * streamed the file in place of actually saving it.
   */
  public byte[] downloadBytes(String objectKey) {
    GetObjectRequest request = GetObjectRequest.builder().bucket(storage.bucket()).key(objectKey).build();
    ResponseBytes<GetObjectResponse> response = s3Client.getObjectAsBytes(request);
    return response.asByteArray();
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
