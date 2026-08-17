package app.nwm.server.config;

import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    String frontendUrl,
    Cors cors,
    Jwt jwt,
    Messaging messaging,
    Storage storage,
    RateLimit rateLimit,
    Lockout lockout,
    Stripe stripe,
    Mail mail) {

  public record Cors(String allowedOrigins) {
    public String[] originsArray() {
      return allowedOrigins.split(",");
    }
  }

  public record Jwt(String secret, int accessTokenTtlMinutes, int refreshTokenTtlDays) {}

  public record Messaging(
      boolean enabled,
      String ttsRequestQueue,
      String ttsResultQueue,
      String ttsExchange,
      String ttsDlq) {}

  public record Storage(
      String endpoint,
      String region,
      String bucket,
      String accessKey,
      String secretKey,
      boolean pathStyleAccess,
      int presignTtlMinutes) {}

  public record RateLimit(
      int authCapacity,
      int authRefillPerMinute,
      int userCapacity,
      int userRefillPerMinute) {}

  /** Per-account lockout after repeated failed logins — a defense rate limiting alone doesn't cover. */
  public record Lockout(int failureThreshold, int durationMinutes) {}

  public record Stripe(
      boolean enabled,
      String secretKey,
      String webhookSecret,
      String successUrl,
      String cancelUrl,
      String portalReturnUrl,
      Map<String, String> priceIds) {}

  /**
   * When {@code enabled} is false, {@code LoggingEmailService} logs the email
   * content instead of sending it — the password-reset/verification flow
   * still works end-to-end for local dev without real SMTP credentials.
   */
  public record Mail(boolean enabled, String from) {}
}
