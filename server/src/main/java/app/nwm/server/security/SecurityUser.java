package app.nwm.server.security;

import app.nwm.server.user.User;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Adapts our {@link User} entity to Spring Security's authentication model. */
public class SecurityUser implements UserDetails {

  private final UUID id;
  private final String email;
  private final String passwordHash;
  private final Collection<GrantedAuthority> authorities;

  public SecurityUser(User user) {
    this.id = user.getId();
    this.email = user.getEmail();
    this.passwordHash = user.getPasswordHash();
    this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
  }

  public UUID getId() {
    return id;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public String getPassword() {
    return passwordHash;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return authorities;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
