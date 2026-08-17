package app.nwm.server.email;

/** Transactional email — password reset and email verification links. */
public interface EmailService {

  void sendPasswordReset(String toEmail, String resetLink);

  void sendEmailVerification(String toEmail, String verifyLink);
}
