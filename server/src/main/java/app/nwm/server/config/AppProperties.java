package app.nwm.server.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    String frontendUrl,
    Cors cors,
    Jwt jwt,
    Messaging messaging,
    Storage storage,
    RateLimit rateLimit) {

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

  public record RateLimit(int authCapacity, int authRefillPerMinute) {}
}
