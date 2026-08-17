package app.nwm.server.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Simple in-memory, per-IP token bucket guarding the unauthenticated auth
 * endpoints (register/login) from credential-stuffing and brute-force
 * attempts. Deliberately scoped to a single instance's memory — a
 * multi-instance production deployment should swap this for a
 * Redis-backed bucket (Bucket4j supports that via the same API) so limits
 * are shared across nodes.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthRateLimitFilter extends OncePerRequestFilter {

  private static final Set<String> LIMITED_PATHS =
      Set.of("/api/auth/login", "/api/auth/register", "/api/auth/forgot-password");

  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
  private final AppProperties.RateLimit rateLimit;
  private final ObjectMapper objectMapper;

  public AuthRateLimitFilter(AppProperties appProperties, ObjectMapper objectMapper) {
    this.rateLimit = appProperties.rateLimit();
    this.objectMapper = objectMapper;
  }

  @Override
  protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
    return !LIMITED_PATHS.contains(request.getRequestURI());
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    Bucket bucket = buckets.computeIfAbsent(clientKey(request), key -> newBucket());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
      return;
    }

    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(
        response.getOutputStream(),
        Map.of(
            "status", HttpStatus.TOO_MANY_REQUESTS.value(),
            "message", "Too many attempts — please wait a moment and try again."));
  }

  private Bucket newBucket() {
    Bandwidth limit =
        Bandwidth.classic(
            rateLimit.authCapacity(),
            Refill.greedy(rateLimit.authRefillPerMinute(), Duration.ofMinutes(1)));
    return Bucket.builder().addLimit(limit).build();
  }

  private String clientKey(HttpServletRequest request) {
    String forwardedFor = request.getHeader("X-Forwarded-For");
    if (forwardedFor != null && !forwardedFor.isBlank()) {
      return forwardedFor.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }
}
