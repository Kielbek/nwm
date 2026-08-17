package app.nwm.server.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Dev-friendly stand-in for {@link SmtpEmailService}: logs the link instead
 * of sending mail, so the password-reset/verification flow is fully
 * exercisable (and testable end to end) without SMTP credentials.
 */
@Service
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LoggingEmailService implements EmailService {

  private static final Logger log = LoggerFactory.getLogger(LoggingEmailService.class);

  @Override
  public void sendPasswordReset(String toEmail, String resetLink) {
    log.info("[app.mail.enabled=false] Password reset link for {}: {}", toEmail, resetLink);
  }

  @Override
  public void sendEmailVerification(String toEmail, String verifyLink) {
    log.info("[app.mail.enabled=false] Email verification link for {}: {}", toEmail, verifyLink);
  }
}
