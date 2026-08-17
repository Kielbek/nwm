package app.nwm.server.auth;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Both {@code refresh_tokens} and {@code verification_tokens} keep every row
 * they ever create (revoked/consumed included) so the tables grow forever
 * without this: once a day, purge anything that's expired or already
 * revoked/consumed — none of it is needed for audit purposes beyond that
 * point, only for active-session/token lookups.
 */
@Component
public class TokenCleanupJob {

  private static final Logger log = LoggerFactory.getLogger(TokenCleanupJob.class);

  private final RefreshTokenRepository refreshTokenRepository;
  private final VerificationTokenRepository verificationTokenRepository;

  public TokenCleanupJob(
      RefreshTokenRepository refreshTokenRepository, VerificationTokenRepository verificationTokenRepository) {
    this.refreshTokenRepository = refreshTokenRepository;
    this.verificationTokenRepository = verificationTokenRepository;
  }

  @Scheduled(cron = "0 0 3 * * *")
  @Transactional
  public void purgeExpiredTokens() {
    Instant now = Instant.now();
    int refreshDeleted = refreshTokenRepository.deleteExpiredOrRevoked(now);
    int verificationDeleted = verificationTokenRepository.deleteExpiredOrConsumed(now);
    log.info(
        "Token cleanup: removed {} expired/revoked refresh tokens, {} expired/consumed verification tokens",
        refreshDeleted,
        verificationDeleted);
  }
}
