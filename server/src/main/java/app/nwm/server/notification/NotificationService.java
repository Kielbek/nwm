package app.nwm.server.notification;

import app.nwm.server.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * The single place that creates notifications, called from wherever
 * something notification-worthy happens (registration, generation
 * results, billing events, ...) so the shape stays consistent.
 */
@Service
public class NotificationService {

  private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

  private final NotificationRepository notificationRepository;

  public NotificationService(NotificationRepository notificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  public void notify(User user, NotificationType type, String title, String body, String link) {
    Notification notification = new Notification(user, type, title, body, link);
    notificationRepository.save(notification);
    log.info("Notification [{}] created for user {}", type, user.getId());
  }

  public void notify(User user, NotificationType type, String title, String body) {
    notify(user, type, title, body, null);
  }
}
