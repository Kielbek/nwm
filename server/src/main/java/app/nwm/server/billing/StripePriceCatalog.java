package app.nwm.server.billing;

import app.nwm.server.common.ApiException;
import app.nwm.server.config.AppProperties;
import app.nwm.server.plan.BillingCycle;
import app.nwm.server.plan.PlanId;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Translates our internal plan/top-up ids into the Stripe Price ids configured via env vars. */
@Component
public class StripePriceCatalog {

  public record PlanPrice(PlanId planId, BillingCycle billingCycle) {}

  private final Map<String, String> priceIds;

  public StripePriceCatalog(AppProperties properties) {
    this.priceIds = properties.stripe().priceIds();
  }

  public String planPriceId(PlanId planId, BillingCycle billingCycle) {
    String key = planId.name().toLowerCase(Locale.ROOT) + "-" + billingCycle.name().toLowerCase(Locale.ROOT);
    return resolve(key);
  }

  public String topUpPriceId(String topUpId) {
    return resolve("topup-" + topUpId.toLowerCase(Locale.ROOT));
  }

  /** Reverse lookup used when a webhook reports a Stripe price id back to us (e.g. a plan switch made via the billing portal). */
  public Optional<PlanPrice> planForPriceId(String stripePriceId) {
    for (PlanId planId : PlanId.values()) {
      for (BillingCycle cycle : BillingCycle.values()) {
        String key = planId.name().toLowerCase(Locale.ROOT) + "-" + cycle.name().toLowerCase(Locale.ROOT);
        if (stripePriceId.equals(priceIds.get(key))) {
          return Optional.of(new PlanPrice(planId, cycle));
        }
      }
    }
    return Optional.empty();
  }

  private String resolve(String key) {
    String priceId = priceIds.get(key);
    if (priceId == null || priceId.isBlank()) {
      throw ApiException.badRequest("No Stripe price configured for '" + key + "'");
    }
    return priceId;
  }
}
