package app.nwm.server.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Stripe redelivers webhook events until it gets a 2xx — recording ids we've
 * already handled makes reprocessing a no-op instead of double-crediting a
 * top-up or re-firing a notification.
 */
@Entity
@Table(name = "processed_stripe_events")
public class ProcessedStripeEvent {

  @Id
  @Column(name = "stripe_event_id")
  private String stripeEventId;

  @Column(name = "event_type", nullable = false)
  private String eventType;

  @Column(name = "processed_at", nullable = false)
  private Instant processedAt;

  protected ProcessedStripeEvent() {}

  public ProcessedStripeEvent(String stripeEventId, String eventType) {
    this.stripeEventId = stripeEventId;
    this.eventType = eventType;
  }

  @PrePersist
  void onCreate() {
    processedAt = Instant.now();
  }

  public String getStripeEventId() {
    return stripeEventId;
  }
}
