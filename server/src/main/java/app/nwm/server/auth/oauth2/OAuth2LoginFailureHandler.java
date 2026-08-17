package app.nwm.server.auth.oauth2;

import app.nwm.server.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

  private final AppProperties appProperties;

  public OAuth2LoginFailureHandler(AppProperties appProperties) {
    this.appProperties = appProperties;
  }

  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
      throws IOException {
    String redirectUrl =
        UriComponentsBuilder.fromUriString(appProperties.frontendUrl() + "/auth/callback")
            .queryParam("error", URLEncoder.encode("google_login_failed", StandardCharsets.UTF_8))
            .build()
            .toUriString();
    response.sendRedirect(redirectUrl);
  }
}
