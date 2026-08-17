package app.nwm.server.admin;

import app.nwm.server.admin.dto.AdminJobResponse;
import app.nwm.server.admin.dto.AdminUserResponse;
import app.nwm.server.admin.dto.GrantCharactersRequest;
import app.nwm.server.admin.dto.SetPlanRequest;
import app.nwm.server.common.ApiException;
import app.nwm.server.notification.NotificationService;
import app.nwm.server.notification.NotificationType;
import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.GenerationJobRepository;
import app.nwm.server.tts.JobStatus;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Support/ops tooling for {@code ROLE_ADMIN} accounts: looking up a user's
 * account state, comping bonus characters or a plan without going through
 * Stripe (refunds, support gestures), and browsing generation jobs across
 * all users for troubleshooting. There is no self-service way to become an
 * admin — the {@code role} column has to be set directly in the database.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

  private static final int MAX_PAGE_SIZE = 100;

  private final UserRepository userRepository;
  private final GenerationJobRepository generationJobRepository;
  private final NotificationService notificationService;

  public AdminController(
      UserRepository userRepository,
      GenerationJobRepository generationJobRepository,
      NotificationService notificationService) {
    this.userRepository = userRepository;
    this.generationJobRepository = generationJobRepository;
    this.notificationService = notificationService;
  }

  @GetMapping("/users")
  public Page<AdminUserResponse> listUsers(
      @RequestParam(required = false) String query, @PageableDefault(size = 20) Pageable pageable) {
    Pageable safePageable = capPageSize(pageable);
    Page<User> users =
        (query == null || query.isBlank())
            ? userRepository.findAll(safePageable)
            : userRepository.findByEmailContainingIgnoreCase(query, safePageable);
    return users.map(AdminUserResponse::from);
  }

  @GetMapping("/users/{id}")
  public AdminUserResponse getUser(@PathVariable UUID id) {
    return AdminUserResponse.from(findUser(id));
  }

  @PostMapping("/users/{id}/grant-characters")
  public AdminUserResponse grantCharacters(
      @PathVariable UUID id, @Valid @RequestBody GrantCharactersRequest request) {
    User user = findUser(id);
    user.setBonusCharacters(user.getBonusCharacters() + request.amount());
    user = userRepository.save(user);
    notificationService.notify(
        user,
        NotificationType.TOPUP_PURCHASED,
        "Otrzymałeś dodatkowe znaki",
        "Nasz zespół wsparcia dodał " + request.amount() + " znaków do Twojego konta.");
    return AdminUserResponse.from(user);
  }

  @PostMapping("/users/{id}/plan")
  public AdminUserResponse setPlan(@PathVariable UUID id, @Valid @RequestBody SetPlanRequest request) {
    User user = findUser(id);
    user.setPlanId(request.planId());
    return AdminUserResponse.from(userRepository.save(user));
  }

  @GetMapping("/jobs")
  public Page<AdminJobResponse> listJobs(
      @RequestParam(required = false) JobStatus status, @PageableDefault(size = 20) Pageable pageable) {
    Pageable safePageable = capPageSize(pageable);
    Page<GenerationJob> jobs =
        status == null
            ? generationJobRepository.findAllByOrderByCreatedAtDesc(safePageable)
            : generationJobRepository.findByStatusOrderByCreatedAtDesc(status, safePageable);
    return jobs.map(AdminJobResponse::from);
  }

  private User findUser(UUID id) {
    return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
  }

  private Pageable capPageSize(Pageable pageable) {
    return PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), MAX_PAGE_SIZE), pageable.getSort());
  }
}
