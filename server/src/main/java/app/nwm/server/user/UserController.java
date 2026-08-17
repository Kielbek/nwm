package app.nwm.server.user;

import app.nwm.server.common.ApiException;
import app.nwm.server.security.SecurityUser;
import app.nwm.server.user.dto.UpdateUserRequest;
import app.nwm.server.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
public class UserController {

  private final UserRepository userRepository;

  public UserController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal SecurityUser principal) {
    return UserResponse.from(currentUser(principal));
  }

  @PatchMapping("/me")
  public UserResponse updateMe(
      @AuthenticationPrincipal SecurityUser principal, @Valid @RequestBody UpdateUserRequest request) {
    User user = currentUser(principal);
    user.setName(request.name());
    return UserResponse.from(userRepository.save(user));
  }

  private User currentUser(SecurityUser principal) {
    return userRepository
        .findById(principal.getId())
        .orElseThrow(() -> ApiException.notFound("User not found"));
  }
}
