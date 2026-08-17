package app.nwm.server.config;

import app.nwm.server.security.SecurityUser;
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
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Per-account token bucket guarding the endpoints an authenticated user can
 * hammer at will: TTS generation and Stripe checkout/portal session
 * creation. {@link AuthRateLimitFilter} already covers the unauthenticated
 * login/register/forgot-password endpoints by IP — this covers what happens
 * *after* login. Same in-memory, single-instance caveat applies (see
 * {@link AuthRateLimitFilter}'s Javadoc).
 *
 * <p>Explicitly wired into the Spring Security chain (after {@code
 * JwtAuthenticationFilter}) rather than relying on generic filter
 * auto-registration, since it needs the authenticated principal that filter
 * resolves. The webhook endpoint is excluded — it's called by Stripe, not a
 * logged-in user, and is already protected by signature verification.
 */
@Component
public class UserRateLimitFilter extends OncePerRequestFilter {

  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
  private final AppProperties.RateLimit rateLimit;
  private final ObjectMapper objectMapper;

  public UserRateLimitFilter(AppProperties appProperties, ObjectMapper objectMapper) {
    this.rateLimit = appProperties.rateLimit();
    this.objectMapper = objectMapper;
  }

  @Override
  protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
    String uri = request.getRequestURI();
    boolean limitedPath = uri.startsWith("/api/tts") || uri.startsWith("/api/billing");
    return !limitedPath || uri.equals("/api/billing/webhook");
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    Bucket bucket = buckets.computeIfAbsent(principalKey(request), key -> newBucket());

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
            "message", "Too many requests — please slow down."));
  }

  private Bucket newBucket() {
    Bandwidth limit =
        Bandwidth.classic(
            rateLimit.userCapacity(), Refill.greedy(rateLimit.userRefillPerMinute(), Duration.ofMinutes(1)));
    return Bucket.builder().addLimit(limit).build();
  }

  private String principalKey(HttpServletRequest request) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof SecurityUser securityUser) {
      return "user:" + securityUser.getId();
    }
    // No resolved principal (e.g. a bad/missing token) — Spring Security
    // rejects the request right after this filter anyway, but fall back to
    // an IP-keyed bucket so this filter never NPEs in that window.
    return "anon:" + request.getRemoteAddr();
  }
}
