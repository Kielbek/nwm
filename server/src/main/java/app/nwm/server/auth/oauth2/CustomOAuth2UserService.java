package app.nwm.server.auth.oauth2;

import app.nwm.server.user.AuthProvider;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads the Google profile once the OAuth2 dance completes, and links it to
 * (or creates) our local {@link User} record — Spring Security's OAuth2User
 * is just an in-memory view of the provider's claims, it isn't persisted on
 * its own.
 */
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

  private static final Logger log = LoggerFactory.getLogger(CustomOAuth2UserService.class);

  private final UserRepository userRepository;

  public CustomOAuth2UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  @Transactional
  public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
    OAuth2User oAuth2User = super.loadUser(userRequest);

    String email = oAuth2User.getAttribute("email");
    Boolean emailVerified = oAuth2User.getAttribute("email_verified");
    String name = oAuth2User.getAttribute("name");
    String picture = oAuth2User.getAttribute("picture");

    if (email == null || email.isBlank()) {
      throw new OAuth2AuthenticationException("Google account has no email");
    }
    // Google always returns lowercase emails, but a local account may have
    // been registered with different casing — normalize both sides so the
    // two don't collide as "different" users and hit the email uniqueness
    // constraint on save.
    String normalizedEmail = email.trim().toLowerCase(java.util.Locale.ROOT);

    try {
      User user =
          userRepository
              .findByEmail(normalizedEmail)
              .map(
                  existing -> {
                    existing.setAvatarUrl(picture);
                    if (existing.getProvider() == AuthProvider.LOCAL) {
                      // A local account already owns this email — link Google
                      // as an additional way to sign into the SAME account
                      // rather than creating a duplicate.
                      existing.setEmailVerified(
                          existing.isEmailVerified() || Boolean.TRUE.equals(emailVerified));
                    }
                    return existing;
                  })
              .orElseGet(
                  () -> {
                    User created =
                        new User(
                            normalizedEmail, name != null ? name : normalizedEmail, AuthProvider.GOOGLE);
                    created.setAvatarUrl(picture);
                    created.setEmailVerified(Boolean.TRUE.equals(emailVerified));
                    return created;
                  });

      userRepository.save(user);

      return new GoogleOAuth2User(oAuth2User, user.getId());
    } catch (OAuth2AuthenticationException ex) {
      throw ex;
    } catch (RuntimeException ex) {
      // Anything unexpected here (a DB constraint violation, etc.) must be
      // wrapped as an OAuth2AuthenticationException — that's the only
      // exception type Spring Security's OAuth2 login filter routes to
      // OAuth2LoginFailureHandler. Anything else propagates past it and
      // surfaces as a raw 500 Whitelabel Error Page instead of redirecting
      // the browser back to the SPA with a friendly error state.
      log.error("Google OAuth2 login failed while resolving/saving the local user", ex);
      throw new OAuth2AuthenticationException(
          new OAuth2Error("server_error", "Failed to resolve local account for Google login", null), ex);
    }
  }
}
