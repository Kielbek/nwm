package app.nwm.server.plan;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/** Mirrors the top-up pack lineup defined client-side in account.service.ts. */
public final class TopUpCatalog {

  public record TopUpDefinition(String id, long characters) {}

  private static final Map<String, TopUpDefinition> TOP_UPS = new LinkedHashMap<>();

  static {
    register("small", 50_000);
    register("medium", 200_000);
    register("large", 500_000);
  }

  private static void register(String id, long characters) {
    TOP_UPS.put(id, new TopUpDefinition(id, characters));
  }

  private TopUpCatalog() {}

  public static Optional<TopUpDefinition> find(String id) {
    return Optional.ofNullable(TOP_UPS.get(id));
  }
}
