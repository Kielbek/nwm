package app.nwm.server.auth.oauth2;

import app.nwm.server.user.AuthProvider;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
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

    User user =
        userRepository
            .findByEmail(email)
            .map(
                existing -> {
                  existing.setAvatarUrl(picture);
                  if (existing.getProvider() == AuthProvider.LOCAL) {
                    // A local account already owns this email — link Google as
                    // an additional way to sign into the SAME account rather
                    // than creating a duplicate.
                    existing.setEmailVerified(existing.isEmailVerified() || Boolean.TRUE.equals(emailVerified));
                  }
                  return existing;
                })
            .orElseGet(
                () -> {
                  User created = new User(email, name != null ? name : email, AuthProvider.GOOGLE);
                  created.setAvatarUrl(picture);
                  created.setEmailVerified(Boolean.TRUE.equals(emailVerified));
                  return created;
                });

    userRepository.save(user);

    return new GoogleOAuth2User(oAuth2User, user.getId());
  }
}
