package app.nwm.server.auth;

import app.nwm.server.auth.dto.AuthResponse;
import app.nwm.server.auth.dto.LoginRequest;
import app.nwm.server.auth.dto.RegisterRequest;
import app.nwm.server.auth.jwt.JwtService;
import app.nwm.server.common.ApiException;
import app.nwm.server.user.AuthProvider;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import app.nwm.server.user.dto.UserResponse;
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

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      AuthenticationManager authenticationManager,
      JwtService jwtService,
      RefreshTokenService refreshTokenService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
    this.refreshTokenService = refreshTokenService;
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
    return issueSession(user);
  }

  @Transactional
  public IssuedSession login(LoginRequest request) {
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.email(), request.password()));
    } catch (BadCredentialsException e) {
      throw ApiException.unauthorized("Invalid email or password");
    }

    User user =
        userRepository
            .findByEmail(request.email())
            .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
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
