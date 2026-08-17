package app.nwm.server.notification.dto;

import app.nwm.server.notification.Notification;
import app.nwm.server.notification.NotificationType;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    NotificationType type,
    String title,
    String body,
    String link,
    boolean read,
    Instant createdAt) {

  public static NotificationResponse from(Notification notification) {
    return new NotificationResponse(
        notification.getId(),
        notification.getType(),
        notification.getTitle(),
        notification.getBody(),
        notification.getLink(),
        notification.getReadAt() != null,
        notification.getCreatedAt());
  }
}
