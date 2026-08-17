package app.nwm.server.notification;

import app.nwm.server.common.ApiException;
import app.nwm.server.notification.dto.NotificationResponse;
import app.nwm.server.security.SecurityUser;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

  private static final int MAX_PAGE_SIZE = 50;

  private final NotificationRepository notificationRepository;

  public NotificationController(NotificationRepository notificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  @GetMapping
  public Page<NotificationResponse> list(
      @AuthenticationPrincipal SecurityUser principal,
      @PageableDefault(size = 20) Pageable pageable) {
    Pageable safePageable =
        PageRequest.of(
            pageable.getPageNumber(), Math.min(pageable.getPageSize(), MAX_PAGE_SIZE), pageable.getSort());
    return notificationRepository
        .findByUserIdOrderByCreatedAtDesc(principal.getId(), safePageable)
        .map(NotificationResponse::from);
  }

  @GetMapping("/unread-count")
  public Map<String, Long> unreadCount(@AuthenticationPrincipal SecurityUser principal) {
    return Map.of("count", notificationRepository.countByUserIdAndReadAtIsNull(principal.getId()));
  }

  @PostMapping("/{id}/read")
  public NotificationResponse markRead(
      @AuthenticationPrincipal SecurityUser principal, @PathVariable UUID id) {
    Notification notification =
        notificationRepository.findById(id).orElseThrow(() -> ApiException.notFound("Notification not found"));
    if (!notification.getUser().getId().equals(principal.getId())) {
      throw ApiException.notFound("Notification not found");
    }
    notification.markRead();
    return NotificationResponse.from(notificationRepository.save(notification));
  }

  @PostMapping("/read-all")
  public void markAllRead(@AuthenticationPrincipal SecurityUser principal) {
    notificationRepository.markAllRead(principal.getId(), java.time.Instant.now());
  }
}
