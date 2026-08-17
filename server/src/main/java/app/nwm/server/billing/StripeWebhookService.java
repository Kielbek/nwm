package app.nwm.server.billing;

import app.nwm.server.notification.NotificationService;
import app.nwm.server.notification.NotificationType;
import app.nwm.server.plan.PlanId;
import app.nwm.server.user.SubscriptionStatus;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(prefix = "app.stripe", name = "enabled", havingValue = "true", matchIfMissing = true)
public class StripeWebhookService {

  private static final Logger log = LoggerFactory.getLogger(StripeWebhookService.class);

  private final UserRepository userRepository;
  private final ProcessedStripeEventRepository processedEventRepository;
  private final StripePriceCatalog priceCatalog;
  private final NotificationService notificationService;

  public StripeWebhookService(
      UserRepository userRepository,
      ProcessedStripeEventRepository processedEventRepository,
      StripePriceCatalog priceCatalog,
      NotificationService notificationService) {
    this.userRepository = userRepository;
    this.processedEventRepository = processedEventRepository;
    this.priceCatalog = priceCatalog;
    this.notificationService = notificationService;
  }

  @Transactional
  public void handle(Event event) {
    if (processedEventRepository.existsById(event.getId())) {
      log.info("Ignoring already-processed Stripe event {} ({})", event.getId(), event.getType());
      return;
    }

    switch (event.getType()) {
      case "checkout.session.completed" -> handleCheckoutCompleted(event);
      case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
      case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
      case "invoice.payment_failed" -> handlePaymentFailed(event);
      case "invoice.payment_succeeded" -> handlePaymentSucceeded(event);
      default -> log.debug("No handler for Stripe event type {} — ignoring", event.getType());
    }

    // Recorded last: if anything above throws, this insert never happens and
    // the whole transaction rolls back, so a retried delivery reprocesses
    // cleanly instead of being silently swallowed.
    processedEventRepository.save(new ProcessedStripeEvent(event.getId(), event.getType()));
  }

  private void handleCheckoutCompleted(Event event) {
    Session session = deserialize(event, Session.class);
    if (session == null || session.getClientReferenceId() == null) {
      log.warn("checkout.session.completed event {} missing client_reference_id", event.getId());
      return;
    }

    UUID userId;
    try {
      userId = UUID.fromString(session.getClientReferenceId());
    } catch (IllegalArgumentException e) {
      log.warn("checkout.session.completed event {} has invalid client_reference_id", event.getId());
      return;
    }

    User user = userRepository.findById(userId).orElse(null);
    if (user == null) {
      log.warn("checkout.session.completed event {} references unknown user {}", event.getId(), userId);
      return;
    }

    if ("subscription".equals(session.getMode())) {
      applySubscriptionCheckout(user, session);
    } else if ("payment".equals(session.getMode())) {
      applyTopUpCheckout(user, session);
    }
  }

  private void applySubscriptionCheckout(User user, Session session) {
    user.setStripeSubscriptionId(session.getSubscription());
    user.setSubscriptionStatus(SubscriptionStatus.ACTIVE);

    String planId = session.getMetadata() != null ? session.getMetadata().get("planId") : null;
    String billingCycle = session.getMetadata() != null ? session.getMetadata().get("billingCycle") : null;
    if (planId != null && billingCycle != null) {
      user.setPlanId(PlanId.valueOf(planId));
      user.setBillingCycle(app.nwm.server.plan.BillingCycle.valueOf(billingCycle));
    }

    userRepository.save(user);
    log.info("Activated subscription {} for user {}", session.getSubscription(), user.getId());
    notificationService.notify(
        user,
        NotificationType.SUBSCRIPTION_ACTIVATED,
        "Subskrypcja aktywna",
        "Twój nowy plan jest już aktywny. Dziękujemy za zakup!");
  }

  private void applyTopUpCheckout(User user, Session session) {
    if (session.getMetadata() == null || !session.getMetadata().containsKey("characters")) {
      log.warn("checkout.session.completed (payment mode) missing top-up metadata for user {}", user.getId());
      return;
    }
    long characters = Long.parseLong(session.getMetadata().get("characters"));
    user.setBonusCharacters(user.getBonusCharacters() + characters);
    userRepository.save(user);
    log.info("Credited {} bonus characters to user {} from top-up purchase", characters, user.getId());
    notificationService.notify(
        user,
        NotificationType.TOPUP_PURCHASED,
        "Doładowanie zaksięgowane",
        "Dodaliśmy " + characters + " znaków do Twojego konta.");
  }

  private void handleSubscriptionUpdated(Event event) {
    Subscription subscription = deserialize(event, Subscription.class);
    if (subscription == null) {
      return;
    }
    User user = resolveUserForSubscription(subscription);
    if (user == null) {
      return;
    }

    SubscriptionStatus status = mapStatus(subscription.getStatus());
    user.setSubscriptionStatus(status);
    user.setStripeSubscriptionId(subscription.getId());

    if (subscription.getItems() != null && !subscription.getItems().getData().isEmpty()) {
      String priceId = subscription.getItems().getData().get(0).getPrice().getId();
      priceCatalog
          .planForPriceId(priceId)
          .ifPresent(
              planPrice -> {
                user.setPlanId(planPrice.planId());
                user.setBillingCycle(planPrice.billingCycle());
              });
    }

    userRepository.save(user);
    log.info("Synced subscription {} status={} for user {}", subscription.getId(), status, user.getId());

    if (status == SubscriptionStatus.PAST_DUE) {
      notificationService.notify(
          user,
          NotificationType.PAYMENT_FAILED,
          "Problem z płatnością",
          "Nie udało się pobrać opłaty za Twoją subskrypcję. Zaktualizuj metodę płatności, aby uniknąć przerwy w usłudze.");
    }
  }

  private void handleSubscriptionDeleted(Event event) {
    Subscription subscription = deserialize(event, Subscription.class);
    if (subscription == null) {
      return;
    }
    User user = resolveUserForSubscription(subscription);
    if (user == null) {
      return;
    }

    user.setSubscriptionStatus(SubscriptionStatus.CANCELED);
    user.setPlanId(PlanId.FREE);
    user.setStripeSubscriptionId(null);
    userRepository.save(user);
    log.info("Subscription {} canceled — user {} moved to FREE plan", subscription.getId(), user.getId());
    notificationService.notify(
        user,
        NotificationType.SUBSCRIPTION_CANCELED,
        "Subskrypcja anulowana",
        "Twoja subskrypcja została anulowana. Twoje konto wróciło do planu darmowego.");
  }

  private void handlePaymentFailed(Event event) {
    Invoice invoice = deserialize(event, Invoice.class);
    if (invoice == null || invoice.getCustomer() == null) {
      return;
    }
    userRepository
        .findByStripeCustomerId(invoice.getCustomer())
        .ifPresent(
            user -> {
              user.setSubscriptionStatus(SubscriptionStatus.PAST_DUE);
              userRepository.save(user);
              log.warn("Invoice payment failed for user {}", user.getId());
              notificationService.notify(
                  user,
                  NotificationType.PAYMENT_FAILED,
                  "Problem z płatnością",
                  "Nie udało się pobrać opłaty za fakturę. Zaktualizuj metodę płatności.");
            });
  }

  private void handlePaymentSucceeded(Event event) {
    Invoice invoice = deserialize(event, Invoice.class);
    if (invoice == null || invoice.getCustomer() == null) {
      return;
    }
    // Only the recurring-renewal case gets a notification — the very first
    // invoice on a new subscription is already covered by the
    // SUBSCRIPTION_ACTIVATED notification fired from checkout.session.completed.
    if (!"subscription_cycle".equals(invoice.getBillingReason())) {
      return;
    }
    userRepository
        .findByStripeCustomerId(invoice.getCustomer())
        .ifPresent(
            user -> {
              if (user.getSubscriptionStatus() == SubscriptionStatus.PAST_DUE) {
                user.setSubscriptionStatus(SubscriptionStatus.ACTIVE);
                userRepository.save(user);
              }
              log.info("Subscription renewal payment succeeded for user {}", user.getId());
              notificationService.notify(
                  user,
                  NotificationType.PAYMENT_SUCCEEDED,
                  "Płatność zaakceptowana",
                  "Twoja subskrypcja została odnowiona. Dziękujemy!");
            });
  }

  private User resolveUserForSubscription(Subscription subscription) {
    return userRepository
        .findByStripeSubscriptionId(subscription.getId())
        .or(() -> userRepository.findByStripeCustomerId(subscription.getCustomer()))
        .orElseGet(
            () -> {
              log.warn("No user found for Stripe subscription {}", subscription.getId());
              return null;
            });
  }

  private SubscriptionStatus mapStatus(String stripeStatus) {
    return switch (stripeStatus) {
      case "active", "trialing" -> SubscriptionStatus.ACTIVE;
      case "past_due", "unpaid" -> SubscriptionStatus.PAST_DUE;
      case "canceled" -> SubscriptionStatus.CANCELED;
      default -> SubscriptionStatus.INCOMPLETE;
    };
  }

  @SuppressWarnings("unchecked")
  private <T extends StripeObject> T deserialize(Event event, Class<T> type) {
    try {
      return event
          .getDataObjectDeserializer()
          .getObject()
          .filter(type::isInstance)
          .map(obj -> (T) obj)
          .orElseGet(
              () -> {
                log.warn(
                    "Could not deserialize Stripe event {} data as {} (API version mismatch?)",
                    event.getId(),
                    type.getSimpleName());
                return null;
              });
    } catch (RuntimeException e) {
      log.error("Failed to deserialize Stripe event {} data", event.getId(), e);
      return null;
    }
  }
}
