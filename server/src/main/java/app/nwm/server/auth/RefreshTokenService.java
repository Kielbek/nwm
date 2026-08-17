package app.nwm.server.auth;

import app.nwm.server.config.AppProperties;
import app.nwm.server.user.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Opaque, rotating refresh tokens. The raw token is only ever handed to the
 * client (as an httpOnly cookie) — the database stores nothing but a SHA-256
 * hash of it, so a leaked database dump can't be replayed as a session.
 */
@Service
public class RefreshTokenService {

  private static final SecureRandom RANDOM = new SecureRandom();
  private static final int TOKEN_BYTES = 64;

  private final RefreshTokenRepository refreshTokenRepository;
  private final Duration refreshTokenTtl;

  public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, AppProperties properties) {
    this.refreshTokenRepository = refreshTokenRepository;
    this.refreshTokenTtl = Duration.ofDays(properties.jwt().refreshTokenTtlDays());
  }

  public String issue(User user) {
    byte[] rawBytes = new byte[TOKEN_BYTES];
    RANDOM.nextBytes(rawBytes);
    String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(rawBytes);

    RefreshToken token = new RefreshToken(user, hash(raw), Instant.now().plus(refreshTokenTtl));
    refreshTokenRepository.save(token);
    return raw;
  }

  /**
   * Validates the raw token, revokes it, and returns the owning user —
   * rotation means every refresh consumes the old token and the caller
   * must issue a fresh one via {@link #issue(User)}.
   */
  public Optional<User> consume(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return Optional.empty();
    }
    return refreshTokenRepository
        .findByTokenHash(hash(rawToken))
        .filter(RefreshToken::isValid)
        .map(
            token -> {
              token.revoke();
              refreshTokenRepository.save(token);
              return token.getUser();
            });
  }

  public void revokeAllForUser(java.util.UUID userId) {
    refreshTokenRepository.revokeAllForUser(userId, Instant.now());
  }

  public Duration ttl() {
    return refreshTokenTtl;
  }

  private static String hash(String raw) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(hashed);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }
}
