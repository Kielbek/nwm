package app.nwm.server.billing;

import app.nwm.server.common.ApiException;
import app.nwm.server.config.AppProperties;
import app.nwm.server.plan.BillingCycle;
import app.nwm.server.plan.PlanId;
import app.nwm.server.plan.TopUpCatalog;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Subscription;
import com.stripe.model.billingportal.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.billingportal.SessionCreateParams;
import com.stripe.param.checkout.SessionCreateParams.LineItem;
import com.stripe.param.checkout.SessionCreateParams.Mode;
import com.stripe.param.checkout.SessionCreateParams.SubscriptionData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(prefix = "app.stripe", name = "enabled", havingValue = "true", matchIfMissing = true)
public class BillingService {

  private static final Logger log = LoggerFactory.getLogger(BillingService.class);

  private final UserRepository userRepository;
  private final StripePriceCatalog priceCatalog;
  private final AppProperties.Stripe stripe;

  public BillingService(UserRepository userRepository, StripePriceCatalog priceCatalog, AppProperties properties) {
    this.userRepository = userRepository;
    this.priceCatalog = priceCatalog;
    this.stripe = properties.stripe();
  }

  // noRollbackFor: ensureStripeCustomer() may persist a newly-created Stripe
  // customer id before the checkout-session call below fails — that id must
  // survive so a retry doesn't create a duplicate Stripe customer.
  @Transactional(noRollbackFor = ApiException.class)
  public String createSubscriptionCheckout(User user, PlanId planId, BillingCycle billingCycle) {
    ensureStripeCustomer(user);
    String priceId = priceCatalog.planPriceId(planId, billingCycle);

    try {
      com.stripe.param.checkout.SessionCreateParams params =
          com.stripe.param.checkout.SessionCreateParams.builder()
              .setMode(Mode.SUBSCRIPTION)
              .setCustomer(user.getStripeCustomerId())
              .setClientReferenceId(user.getId().toString())
              .addLineItem(LineItem.builder().setPrice(priceId).setQuantity(1L).build())
              .setSuccessUrl(stripe.successUrl())
              .setCancelUrl(stripe.cancelUrl())
              .putMetadata("userId", user.getId().toString())
              .putMetadata("planId", planId.name())
              .putMetadata("billingCycle", billingCycle.name())
              .setSubscriptionData(
                  SubscriptionData.builder()
                      .putMetadata("userId", user.getId().toString())
                      .putMetadata("planId", planId.name())
                      .putMetadata("billingCycle", billingCycle.name())
                      .build())
              .build();
      return newCheckoutSession(params).getUrl();
    } catch (StripeException e) {
      log.error("Failed to create subscription checkout session for user {}", user.getId(), e);
      throw ApiException.badRequest("Could not start checkout — please try again");
    }
  }

  // Same reasoning as createSubscriptionCheckout — see the comment there.
  @Transactional(noRollbackFor = ApiException.class)
  public String createTopUpCheckout(User user, String topUpId) {
    ensureStripeCustomer(user);
    var topUp =
        TopUpCatalog.find(topUpId).orElseThrow(() -> ApiException.badRequest("Unknown top-up: " + topUpId));
    String priceId = priceCatalog.topUpPriceId(topUpId);

    try {
      com.stripe.param.checkout.SessionCreateParams params =
          com.stripe.param.checkout.SessionCreateParams.builder()
              .setMode(Mode.PAYMENT)
              .setCustomer(user.getStripeCustomerId())
              .setClientReferenceId(user.getId().toString())
              .addLineItem(LineItem.builder().setPrice(priceId).setQuantity(1L).build())
              .setSuccessUrl(stripe.successUrl())
              .setCancelUrl(stripe.cancelUrl())
              .putMetadata("userId", user.getId().toString())
              .putMetadata("topUpId", topUpId)
              .putMetadata("characters", String.valueOf(topUp.characters()))
              .build();
      return newCheckoutSession(params).getUrl();
    } catch (StripeException e) {
      log.error("Failed to create top-up checkout session for user {}", user.getId(), e);
      throw ApiException.badRequest("Could not start checkout — please try again");
    }
  }

  public String createBillingPortalSession(User user) {
    if (user.getStripeCustomerId() == null) {
      throw ApiException.badRequest("No billing account yet — subscribe to a plan first");
    }
    try {
      SessionCreateParams params =
          SessionCreateParams.builder()
              .setCustomer(user.getStripeCustomerId())
              .setReturnUrl(stripe.portalReturnUrl())
              .build();
      return Session.create(params).getUrl();
    } catch (StripeException e) {
      log.error("Failed to create billing portal session for user {}", user.getId(), e);
      throw ApiException.badRequest("Could not open billing portal — please try again");
    }
  }

  @Transactional
  public void cancelSubscription(User user) {
    if (user.getStripeSubscriptionId() == null) {
      throw ApiException.badRequest("No active subscription to cancel");
    }
    try {
      Subscription subscription = Subscription.retrieve(user.getStripeSubscriptionId());
      subscription.update(SubscriptionUpdateParams.builder().setCancelAtPeriodEnd(true).build());
      log.info("Subscription {} for user {} set to cancel at period end", subscription.getId(), user.getId());
    } catch (StripeException e) {
      log.error("Failed to cancel subscription for user {}", user.getId(), e);
      throw ApiException.badRequest("Could not cancel subscription — please try again");
    }
  }

  private com.stripe.model.checkout.Session newCheckoutSession(
      com.stripe.param.checkout.SessionCreateParams params) throws StripeException {
    return com.stripe.model.checkout.Session.create(params);
  }

  private void ensureStripeCustomer(User user) {
    if (user.getStripeCustomerId() != null) {
      return;
    }
    try {
      CustomerCreateParams params =
          CustomerCreateParams.builder()
              .setEmail(user.getEmail())
              .setName(user.getName())
              .putMetadata("userId", user.getId().toString())
              .build();
      Customer customer = Customer.create(params);
      user.setStripeCustomerId(customer.getId());
      userRepository.save(user);
      log.info("Created Stripe customer {} for user {}", customer.getId(), user.getId());
    } catch (StripeException e) {
      log.error("Failed to create Stripe customer for user {}", user.getId(), e);
      throw ApiException.badRequest("Could not set up billing — please try again");
    }
  }
}
