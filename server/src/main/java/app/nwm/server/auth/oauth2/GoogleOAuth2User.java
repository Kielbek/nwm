package app.nwm.server.auth.oauth2;

import java.util.Map;
import java.util.UUID;
import org.springframework.security.oauth2.core.user.OAuth2User;

/** Wraps Google's OAuth2User with our own internal user id, resolved once at login time. */
public class GoogleOAuth2User implements OAuth2User {

  private final OAuth2User delegate;
  private final UUID userId;

  public GoogleOAuth2User(OAuth2User delegate, UUID userId) {
    this.delegate = delegate;
    this.userId = userId;
  }

  public UUID getUserId() {
    return userId;
  }

  @Override
  public Map<String, Object> getAttributes() {
    return delegate.getAttributes();
  }

  @Override
  public java.util.Collection<? extends org.springframework.security.core.GrantedAuthority>
      getAuthorities() {
    return delegate.getAuthorities();
  }

  @Override
  public String getName() {
    return delegate.getName();
  }
}
