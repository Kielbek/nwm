package app.nwm.server.auth.jwt;

import app.nwm.server.security.SecurityUser;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final String AUTH_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  private final JwtService jwtService;
  private final UserRepository userRepository;

  public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    extractToken(request)
        .flatMap(jwtService::parse)
        .flatMap(this::loadUser)
        .ifPresent(
            user -> {
              SecurityUser principal = new SecurityUser(user);
              var authentication =
                  new UsernamePasswordAuthenticationToken(
                      principal, null, principal.getAuthorities());
              authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
              SecurityContextHolder.getContext().setAuthentication(authentication);
            });

    filterChain.doFilter(request, response);
  }

  private Optional<String> extractToken(HttpServletRequest request) {
    String header = request.getHeader(AUTH_HEADER);
    if (header != null && header.startsWith(BEARER_PREFIX)) {
      return Optional.of(header.substring(BEARER_PREFIX.length()));
    }
    return Optional.empty();
  }

  private Optional<User> loadUser(Claims claims) {
    try {
      UUID userId = UUID.fromString(claims.getSubject());
      return userRepository.findById(userId);
    } catch (IllegalArgumentException e) {
      return Optional.empty();
    }
  }
}
