package app.nwm.server.common;

import org.springframework.http.HttpStatus;

/** Base type for domain errors that should be surfaced to API clients with a specific status. */
public class ApiException extends RuntimeException {

  private final HttpStatus status;

  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public HttpStatus getStatus() {
    return status;
  }

  public static ApiException conflict(String message) {
    return new ApiException(HttpStatus.CONFLICT, message);
  }

  public static ApiException unauthorized(String message) {
    return new ApiException(HttpStatus.UNAUTHORIZED, message);
  }

  public static ApiException notFound(String message) {
    return new ApiException(HttpStatus.NOT_FOUND, message);
  }

  public static ApiException badRequest(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, message);
  }

  public static ApiException tooManyRequests(String message) {
    return new ApiException(HttpStatus.TOO_MANY_REQUESTS, message);
  }

  public static ApiException quotaExceeded(String message) {
    return new ApiException(HttpStatus.PAYMENT_REQUIRED, message);
  }

  public static ApiException locked(String message) {
    return new ApiException(HttpStatus.LOCKED, message);
  }
}
