package app.nwm.server.common;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiError> handleApiException(ApiException ex) {
    return ResponseEntity.status(ex.getStatus())
        .body(ApiError.of(ex.getStatus().value(), ex.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    List<String> details =
        ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .toList();
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiError.of(HttpStatus.BAD_REQUEST.value(), "Validation failed", details));
  }

  @ExceptionHandler({BadCredentialsException.class, AuthenticationException.class})
  public ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiError.of(HttpStatus.UNAUTHORIZED.value(), "Invalid email or password"));
  }

  // Thrown by @PreAuthorize when method security (not the coarser
  // authorizeHttpRequests rules in SecurityConfig) rejects a call — this
  // matters for endpoints under a permitAll() path prefix (e.g. /api/auth/**)
  // that still guard individual methods with @PreAuthorize, since those never
  // hit SecurityConfig's own authenticationEntryPoint.
  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    boolean authenticated =
        authentication != null
            && authentication.isAuthenticated()
            && !(authentication instanceof AnonymousAuthenticationToken);
    HttpStatus status = authenticated ? HttpStatus.FORBIDDEN : HttpStatus.UNAUTHORIZED;
    String message = authenticated ? "Access denied" : "Authentication required";
    return ResponseEntity.status(status).body(ApiError.of(status.value(), message));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
    // Never leak internal exception details (stack traces, SQL, etc.) to clients —
    // log the real cause server-side and return a generic message instead.
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Unexpected server error"));
  }
}
