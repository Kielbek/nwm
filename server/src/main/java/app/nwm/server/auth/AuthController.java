package app.nwm.server.auth;

import app.nwm.server.auth.dto.AuthResponse;
import app.nwm.server.auth.dto.ForgotPasswordRequest;
import app.nwm.server.auth.dto.LoginRequest;
import app.nwm.server.auth.dto.RegisterRequest;
import app.nwm.server.auth.dto.ResetPasswordRequest;
import app.nwm.server.auth.dto.VerifyEmailRequest;
import app.nwm.server.common.ApiException;
import app.nwm.server.security.SecurityUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

  private final AuthService authService;
  private final RefreshTokenService refreshTokenService;

  public AuthController(AuthService authService, RefreshTokenService refreshTokenService) {
    this.authService = authService;
    this.refreshTokenService = refreshTokenService;
  }

  @PostMapping("/api/auth/register")
  public ResponseEntity<AuthResponse> register(
      @Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
    AuthService.IssuedSession session = authService.register(request);
    attachRefreshCookie(response, session);
    return ResponseEntity.status(HttpStatus.CREATED).body(session.body());
  }

  @PostMapping("/api/auth/login")
  public ResponseEntity<AuthResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    AuthService.IssuedSession session = authService.login(request);
    attachRefreshCookie(response, session);
    return ResponseEntity.ok(session.body());
  }

  @PostMapping("/api/auth/refresh")
  public ResponseEntity<AuthResponse> refresh(
      HttpServletRequest request, HttpServletResponse response) {
    String rawToken =
        AuthCookies.read(request)
            .orElseThrow(() -> ApiException.unauthorized("No refresh token present"));
    AuthService.IssuedSession session = authService.refresh(rawToken);
    attachRefreshCookie(response, session);
    return ResponseEntity.ok(session.body());
  }

  @PostMapping("/api/auth/logout")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> logout(
      @AuthenticationPrincipal SecurityUser principal, HttpServletResponse response) {
    // Revoking every refresh token for the user (not just the one presented)
    // signs them out everywhere — the simplest safe behavior for a "log out"
    // button; a "sign out of this device only" variant would revoke just the
    // presented token instead.
    authService.logoutAllSessions(principal.getId());
    response.addCookie(AuthCookies.clear());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/api/auth/forgot-password")
  public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
    authService.forgotPassword(request.email());
    return ResponseEntity.ok().build();
  }

  @PostMapping("/api/auth/reset-password")
  public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
    authService.resetPassword(request.token(), request.newPassword());
    return ResponseEntity.ok().build();
  }

  @PostMapping("/api/auth/verify-email")
  public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
    authService.verifyEmail(request.token());
    return ResponseEntity.ok().build();
  }

  @PostMapping("/api/auth/verify-email/resend")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> resendVerificationEmail(@AuthenticationPrincipal SecurityUser principal) {
    authService.requestEmailVerification(principal.getId());
    return ResponseEntity.ok().build();
  }

  private void attachRefreshCookie(HttpServletResponse response, AuthService.IssuedSession session) {
    int maxAgeSeconds = (int) refreshTokenService.ttl().toSeconds();
    response.addCookie(AuthCookies.build(session.rawRefreshToken(), maxAgeSeconds));
  }
}
