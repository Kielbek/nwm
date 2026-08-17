package app.nwm.server.auth;

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

/** Opaque, hashed, single-use tokens — same raw-value-never-stored approach as {@link RefreshTokenService}. */
@Service
public class VerificationTokenService {

  private static final SecureRandom RANDOM = new SecureRandom();
  private static final int TOKEN_BYTES = 32;

  public static final Duration PASSWORD_RESET_TTL = Duration.ofHours(1);
  public static final Duration EMAIL_VERIFICATION_TTL = Duration.ofHours(24);

  private final VerificationTokenRepository repository;

  public VerificationTokenService(VerificationTokenRepository repository) {
    this.repository = repository;
  }

  /** Invalidates any outstanding token of the same type for this user before issuing a fresh one. */
  public String issue(User user, VerificationTokenType type, Duration ttl) {
    repository.invalidateOutstanding(user.getId(), type, Instant.now());

    byte[] rawBytes = new byte[TOKEN_BYTES];
    RANDOM.nextBytes(rawBytes);
    String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(rawBytes);

    repository.save(new VerificationToken(user, hash(raw), type, Instant.now().plus(ttl)));
    return raw;
  }

  public Optional<User> consume(String rawToken, VerificationTokenType type) {
    if (rawToken == null || rawToken.isBlank()) {
      return Optional.empty();
    }
    return repository
        .findByTokenHashAndType(hash(rawToken), type)
        .filter(VerificationToken::isValid)
        .map(
            token -> {
              token.consume();
              repository.save(token);
              return token.getUser();
            });
  }

  private static String hash(String raw) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return Base64.getEncoder().encodeToString(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }
}
