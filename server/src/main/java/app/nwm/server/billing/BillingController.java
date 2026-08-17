package app.nwm.server.billing;

import app.nwm.server.billing.dto.CheckoutSessionResponse;
import app.nwm.server.billing.dto.SubscriptionCheckoutRequest;
import app.nwm.server.billing.dto.TopUpCheckoutRequest;
import app.nwm.server.common.ApiException;
import app.nwm.server.security.SecurityUser;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
@PreAuthorize("isAuthenticated()")
@ConditionalOnProperty(prefix = "app.stripe", name = "enabled", havingValue = "true", matchIfMissing = true)
public class BillingController {

  private final BillingService billingService;
  private final UserRepository userRepository;

  public BillingController(BillingService billingService, UserRepository userRepository) {
    this.billingService = billingService;
    this.userRepository = userRepository;
  }

  @PostMapping("/checkout/subscription")
  public CheckoutSessionResponse checkoutSubscription(
      @AuthenticationPrincipal SecurityUser principal, @Valid @RequestBody SubscriptionCheckoutRequest request) {
    User user = currentUser(principal);
    String url = billingService.createSubscriptionCheckout(user, request.planId(), request.billingCycle());
    return new CheckoutSessionResponse(url);
  }

  @PostMapping("/checkout/topup")
  public CheckoutSessionResponse checkoutTopUp(
      @AuthenticationPrincipal SecurityUser principal, @Valid @RequestBody TopUpCheckoutRequest request) {
    User user = currentUser(principal);
    String url = billingService.createTopUpCheckout(user, request.topUpId());
    return new CheckoutSessionResponse(url);
  }

  @PostMapping("/portal")
  public CheckoutSessionResponse billingPortal(@AuthenticationPrincipal SecurityUser principal) {
    User user = currentUser(principal);
    return new CheckoutSessionResponse(billingService.createBillingPortalSession(user));
  }

  @PostMapping("/subscription/cancel")
  public void cancelSubscription(@AuthenticationPrincipal SecurityUser principal) {
    billingService.cancelSubscription(currentUser(principal));
  }

  private User currentUser(SecurityUser principal) {
    return userRepository.findById(principal.getId()).orElseThrow(() -> ApiException.notFound("User not found"));
  }
}
