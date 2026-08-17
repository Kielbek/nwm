package app.nwm.server.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Stamps every request with a correlation id (reusing an incoming
 * {@code X-Request-Id} from a load balancer/gateway if present, generating
 * one otherwise), puts it in MDC so every log line for the request carries
 * it, echoes it back in the response, and logs a one-line summary once the
 * request completes — the closest thing to an access log this app has.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestLoggingFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger("app.nwm.server.access");
  private static final String REQUEST_ID_HEADER = "X-Request-Id";
  private static final String MDC_KEY = "requestId";

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    String requestId = resolveRequestId(request);
    MDC.put(MDC_KEY, requestId);
    response.setHeader(REQUEST_ID_HEADER, requestId);

    long start = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long durationMs = System.currentTimeMillis() - start;
      log.info(
          "{} {} -> {} ({} ms)",
          request.getMethod(),
          request.getRequestURI(),
          response.getStatus(),
          durationMs);
      MDC.remove(MDC_KEY);
    }
  }

  private String resolveRequestId(HttpServletRequest request) {
    String incoming = request.getHeader(REQUEST_ID_HEADER);
    return (incoming != null && !incoming.isBlank()) ? incoming : UUID.randomUUID().toString();
  }
}
