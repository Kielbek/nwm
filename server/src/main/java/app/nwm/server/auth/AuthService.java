package app.nwm.server.auth;

import app.nwm.server.auth.dto.AuthResponse;
import app.nwm.server.auth.dto.LoginRequest;
import app.nwm.server.auth.dto.RegisterRequest;
import app.nwm.server.auth.jwt.JwtService;
import app.nwm.server.common.ApiException;
import app.nwm.server.config.AppProperties;
import app.nwm.server.email.EmailService;
import app.nwm.server.notification.NotificationService;
import app.nwm.server.notification.NotificationType;
import app.nwm.server.user.AuthProvider;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import app.nwm.server.user.dto.UserResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final RefreshTokenService refreshTokenService;
  private final VerificationTokenService verificationTokenService;
  private final NotificationService notificationService;
  private final EmailService emailService;
  private final AppProperties.Lockout lockout;
  private final String frontendUrl;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      AuthenticationManager authenticationManager,
      JwtService jwtService,
      RefreshTokenService refreshTokenService,
      VerificationTokenService verificationTokenService,
      NotificationService notificationService,
      EmailService emailService,
      AppProperties appProperties) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
    this.refreshTokenService = refreshTokenService;
    this.verificationTokenService = verificationTokenService;
    this.notificationService = notificationService;
    this.emailService = emailService;
    this.lockout = appProperties.lockout();
    this.frontendUrl = appProperties.frontendUrl();
  }

  @Transactional
  public IssuedSession register(RegisterRequest request) {
    if (userRepository.existsByEmail(request.email())) {
      // Same message a real "email taken" case would use elsewhere would let an
      // attacker enumerate accounts; for registration the tradeoff is different
      // since the user just typed this email themselves, so a direct message is fine.
      throw ApiException.conflict("An account with that email already exists");
    }

    User user = new User(request.email(), request.name(), AuthProvider.LOCAL);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user = userRepository.save(user);

    log.info("Registered new local account: {}", user.getId());
    notificationService.notify(
        user,
        NotificationType.WELCOME,
        "Witaj w NWM",
        "Dziękujemy za dołączenie! Zacznij od wygenerowania pierwszej mowy z tekstu.");
    sendVerificationEmail(user);
    return issueSession(user);
  }

  // noRollbackFor: this method intentionally throws ApiException on bad
  // credentials/lockout *after* persisting the failed-attempt counter — a
  // default rollback would silently discard that bookkeeping on every
  // failed login, defeating the lockout entirely.
  @Transactional(noRollbackFor = ApiException.class)
  public IssuedSession login(LoginRequest request) {
    User user = userRepository.findByEmail(request.email()).orElse(null);

    if (user != null && user.isLocked()) {
      log.warn("Login blocked for locked account: {}", user.getId());
      throw ApiException.locked(
          "Too many failed login attempts. Try again in a few minutes.");
    }

    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.email(), request.password()));
    } catch (BadCredentialsException e) {
      if (user != null) {
        user.registerFailedLogin(lockout.failureThreshold(), Duration.ofMinutes(lockout.durationMinutes()));
        userRepository.save(user);
        if (user.isLocked()) {
          log.warn(
              "Account locked after {} failed login attempts: {}",
              user.getFailedLoginAttempts(),
              user.getId());
        }
      }
      throw ApiException.unauthorized("Invalid email or password");
    }

    // Authentication succeeded, so `user` is guaranteed non-null here.
    user.resetFailedLogins();
    userRepository.save(user);
    return issueSession(user);
  }

  @Transactional
  public IssuedSession refresh(String rawRefreshToken) {
    User user =
        refreshTokenService
            .consume(rawRefreshToken)
            .orElseThrow(() -> ApiException.unauthorized("Refresh token is invalid or expired"));
    return issueSession(user);
  }

  @Transactional
  public void logoutAllSessions(java.util.UUID userId) {
    refreshTokenService.revokeAllForUser(userId);
  }

  /**
   * Always succeeds from the caller's point of view, whether or not the email
   * belongs to an account — revealing that would let an attacker enumerate
   * registered emails via the reset flow.
   */
  @Transactional
  public void forgotPassword(String email) {
    userRepository
        .findByEmail(email)
        .filter(user -> user.getProvider() == AuthProvider.LOCAL)
        .ifPresent(
            user -> {
              String token = verificationTokenService.issue(
                  user, VerificationTokenType.PASSWORD_RESET, VerificationTokenService.PASSWORD_RESET_TTL);
              String link = frontendUrl + "/reset-password?token=" + urlEncode(token);
              emailService.sendPasswordReset(user.getEmail(), link);
              log.info("Issued password reset token for user {}", user.getId());
            });
  }

  @Transactional
  public void resetPassword(String rawToken, String newPassword) {
    User user =
        verificationTokenService
            .consume(rawToken, VerificationTokenType.PASSWORD_RESET)
            .orElseThrow(() -> ApiException.badRequest("Reset link is invalid or has expired"));

    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.resetFailedLogins();
    userRepository.save(user);
    // A password reset is a strong signal the account may have been at risk —
    // invalidate every existing session, including whatever the attacker (if
    // any) was using.
    refreshTokenService.revokeAllForUser(user.getId());
    log.info("Password reset completed for user {}", user.getId());
  }

  @Transactional
  public void requestEmailVerification(java.util.UUID userId) {
    User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
    if (user.isEmailVerified()) {
      return;
    }
    sendVerificationEmail(user);
  }

  @Transactional
  public void verifyEmail(String rawToken) {
    User user =
        verificationTokenService
            .consume(rawToken, VerificationTokenType.EMAIL_VERIFICATION)
            .orElseThrow(() -> ApiException.badRequest("Verification link is invalid or has expired"));
    user.setEmailVerified(true);
    userRepository.save(user);
    log.info("Email verified for user {}", user.getId());
  }

  private void sendVerificationEmail(User user) {
    String token = verificationTokenService.issue(
        user, VerificationTokenType.EMAIL_VERIFICATION, VerificationTokenService.EMAIL_VERIFICATION_TTL);
    String link = frontendUrl + "/verify-email?token=" + urlEncode(token);
    emailService.sendEmailVerification(user.getEmail(), link);
  }

  private static String urlEncode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private IssuedSession issueSession(User user) {
    String accessToken =
        jwtService.issueAccessToken(user.getId(), user.getEmail(), user.getRole().name());
    String refreshToken = refreshTokenService.issue(user);
    AuthResponse body =
        new AuthResponse(
            accessToken, jwtService.accessTokenTtl().toSeconds(), UserResponse.from(user));
    return new IssuedSession(body, refreshToken);
  }

  public record IssuedSession(AuthResponse body, String rawRefreshToken) {}
}
