package app.nwm.server.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** The Stripe Java SDK is configured via a single static API key, set once at startup. */
@Component
@ConditionalOnProperty(prefix = "app.stripe", name = "enabled", havingValue = "true", matchIfMissing = true)
public class StripeConfig {

  private final AppProperties.Stripe stripe;

  public StripeConfig(AppProperties properties) {
    this.stripe = properties.stripe();
  }

  private static final int CONNECT_TIMEOUT_MS = 10_000;
  private static final int READ_TIMEOUT_MS = 30_000;

  @PostConstruct
  void init() {
    if (stripe.secretKey() == null || stripe.secretKey().isBlank()) {
      throw new IllegalStateException(
          "app.stripe.enabled is true but STRIPE_SECRET_KEY is not set");
    }
    Stripe.apiKey = stripe.secretKey();
    // Without this, a hung Stripe API call blocks the request thread
    // indefinitely — the SDK's own defaults are much longer than acceptable
    // for a synchronous checkout/portal endpoint.
    Stripe.setConnectTimeout(CONNECT_TIMEOUT_MS);
    Stripe.setReadTimeout(READ_TIMEOUT_MS);
  }
}
