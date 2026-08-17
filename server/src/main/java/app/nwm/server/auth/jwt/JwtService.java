package app.nwm.server.auth.jwt;

import app.nwm.server.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** Issues and validates short-lived stateless JWT access tokens. */
@Service
public class JwtService {

  private static final String CLAIM_EMAIL = "email";
  private static final String CLAIM_ROLE = "role";

  private final SecretKey signingKey;
  private final Duration accessTokenTtl;

  public JwtService(AppProperties properties) {
    byte[] secretBytes = properties.jwt().secret().getBytes(StandardCharsets.UTF_8);
    if (secretBytes.length < 32) {
      throw new IllegalStateException(
          "app.jwt.secret must be at least 32 bytes — set JWT_SECRET to a long random value");
    }
    this.signingKey = Keys.hmacShaKeyFor(secretBytes);
    this.accessTokenTtl = Duration.ofMinutes(properties.jwt().accessTokenTtlMinutes());
  }

  public String issueAccessToken(UUID userId, String email, String role) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(userId.toString())
        .claim(CLAIM_EMAIL, email)
        .claim(CLAIM_ROLE, role)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(accessTokenTtl)))
        .signWith(signingKey)
        .compact();
  }

  public Optional<Claims> parse(String token) {
    try {
      Claims claims =
          Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
      return Optional.of(claims);
    } catch (JwtException | IllegalArgumentException e) {
      return Optional.empty();
    }
  }

  public Duration accessTokenTtl() {
    return accessTokenTtl;
  }
}
