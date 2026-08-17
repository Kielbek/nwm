package app.nwm.server.email;

import app.nwm.server.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
public class SmtpEmailService implements EmailService {

  private static final Logger log = LoggerFactory.getLogger(SmtpEmailService.class);

  private final JavaMailSender mailSender;
  private final String from;

  public SmtpEmailService(JavaMailSender mailSender, AppProperties properties) {
    this.mailSender = mailSender;
    this.from = properties.mail().from();
  }

  @Override
  public void sendPasswordReset(String toEmail, String resetLink) {
    send(
        toEmail,
        "Zresetuj hasło do NWM",
        "Kliknij w link, aby ustawić nowe hasło (link ważny 1 godzinę):\n\n" + resetLink
            + "\n\nJeśli to nie Ty prosiłeś o reset hasła, zignoruj tę wiadomość.");
  }

  @Override
  public void sendEmailVerification(String toEmail, String verifyLink) {
    send(
        toEmail,
        "Potwierdź swój adres email",
        "Kliknij w link, aby potwierdzić adres email (link ważny 24 godziny):\n\n" + verifyLink);
  }

  private void send(String to, String subject, String text) {
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(from);
    message.setTo(to);
    message.setSubject(subject);
    message.setText(text);
    try {
      mailSender.send(message);
    } catch (RuntimeException e) {
      // Never let a mail server outage surface as a 500 to the caller — the
      // token is already persisted, so the user can request a fresh email later.
      log.error("Failed to send email to {}", to, e);
    }
  }
}
