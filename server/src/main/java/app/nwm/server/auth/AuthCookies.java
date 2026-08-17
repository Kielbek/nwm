package app.nwm.server.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

public final class AuthCookies {

  public static final String REFRESH_COOKIE_NAME = "nwm_refresh_token";
  public static final String REFRESH_COOKIE_PATH = "/api/auth";

  private AuthCookies() {}

  public static Cookie build(String rawRefreshToken, int maxAgeSeconds) {
    Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, rawRefreshToken);
    cookie.setHttpOnly(true);
    cookie.setSecure(true);
    cookie.setPath(REFRESH_COOKIE_PATH);
    cookie.setMaxAge(maxAgeSeconds);
    cookie.setAttribute("SameSite", "Lax");
    return cookie;
  }

  public static Cookie clear() {
    Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, "");
    cookie.setHttpOnly(true);
    cookie.setSecure(true);
    cookie.setPath(REFRESH_COOKIE_PATH);
    cookie.setMaxAge(0);
    return cookie;
  }

  public static Optional<String> read(HttpServletRequest request) {
    if (request.getCookies() == null) {
      return Optional.empty();
    }
    for (Cookie cookie : request.getCookies()) {
      if (REFRESH_COOKIE_NAME.equals(cookie.getName())) {
        return Optional.of(cookie.getValue());
      }
    }
    return Optional.empty();
  }
}
