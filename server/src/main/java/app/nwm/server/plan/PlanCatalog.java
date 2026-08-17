package app.nwm.server.plan;

import java.util.EnumMap;
import java.util.Map;

/**
 * Mirrors the plan lineup defined client-side in account.service.ts so the
 * server enforces the same character quotas it advertises in the UI.
 */
public final class PlanCatalog {

  public record PlanDefinition(PlanId id, long characterLimit) {}

  private static final Map<PlanId, PlanDefinition> PLANS = new EnumMap<>(PlanId.class);

  static {
    register(PlanId.FREE, 10_000);
    register(PlanId.STARTER, 60_000);
    register(PlanId.PRO, 300_000);
    register(PlanId.CREATOR, 700_000);
    register(PlanId.PREMIUM, 1_500_000);
    register(PlanId.BUSINESS, 5_000_000);
  }

  private static void register(PlanId id, long characterLimit) {
    PLANS.put(id, new PlanDefinition(id, characterLimit));
  }

  private PlanCatalog() {}

  public static PlanDefinition get(PlanId id) {
    PlanDefinition definition = PLANS.get(id);
    if (definition == null) {
      throw new IllegalArgumentException("Unknown plan: " + id);
    }
    return definition;
  }
}
