package app.nwm.server.auth.oauth2;

import app.nwm.server.auth.AuthCookies;
import app.nwm.server.auth.RefreshTokenService;
import app.nwm.server.auth.jwt.JwtService;
import app.nwm.server.config.AppProperties;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Once Google confirms the user's identity, mint the same access/refresh
 * token pair a normal email+password login would get, then hand the browser
 * back to the Angular app with the access token in the URL — the SPA is
 * expected to read it from {@code /auth/callback} and discard it from the
 * address bar immediately.
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

  private static final Logger log = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);

  private final JwtService jwtService;
  private final RefreshTokenService refreshTokenService;
  private final UserRepository userRepository;
  private final AppProperties appProperties;

  public OAuth2LoginSuccessHandler(
      JwtService jwtService,
      RefreshTokenService refreshTokenService,
      UserRepository userRepository,
      AppProperties appProperties) {
    this.jwtService = jwtService;
    this.refreshTokenService = refreshTokenService;
    this.userRepository = userRepository;
    this.appProperties = appProperties;
  }

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication)
      throws IOException {

    // This handler runs after Spring Security has already committed to a
    // successful authentication, so a failure here (a DB hiccup issuing the
    // refresh token, etc.) can no longer be routed through
    // OAuth2LoginFailureHandler by Spring itself — an uncaught exception at
    // this point would otherwise surface as a raw 500 Whitelabel page
    // instead of sending the browser back to the SPA. Catch and redirect
    // the same way the failure handler does.
    try {
      GoogleOAuth2User principal = (GoogleOAuth2User) authentication.getPrincipal();
      User user =
          userRepository
              .findById(principal.getUserId())
              .orElseThrow(() -> new IllegalStateException("OAuth2 user vanished mid-login"));

      String accessToken =
          jwtService.issueAccessToken(user.getId(), user.getEmail(), user.getRole().name());
      String refreshToken = refreshTokenService.issue(user);

      response.addCookie(
          AuthCookies.build(refreshToken, (int) refreshTokenService.ttl().toSeconds()));

      String redirectUrl =
          UriComponentsBuilder.fromUriString(appProperties.frontendUrl() + "/auth/callback")
              .queryParam("token", URLEncoder.encode(accessToken, StandardCharsets.UTF_8))
              .build()
              .toUriString();

      response.sendRedirect(redirectUrl);
    } catch (RuntimeException ex) {
      log.error("Google OAuth2 login succeeded but issuing local session tokens failed", ex);
      String redirectUrl =
          UriComponentsBuilder.fromUriString(appProperties.frontendUrl() + "/auth/callback")
              .queryParam("error", URLEncoder.encode("google_login_failed", StandardCharsets.UTF_8))
              .build()
              .toUriString();
      response.sendRedirect(redirectUrl);
    }
  }
}
