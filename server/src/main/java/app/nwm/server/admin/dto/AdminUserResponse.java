package app.nwm.server.admin.dto;

import app.nwm.server.plan.BillingCycle;
import app.nwm.server.plan.PlanCatalog;
import app.nwm.server.plan.PlanId;
import app.nwm.server.user.AuthProvider;
import app.nwm.server.user.Role;
import app.nwm.server.user.SubscriptionStatus;
import app.nwm.server.user.User;
import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(
    UUID id,
    String email,
    String name,
    Role role,
    AuthProvider provider,
    boolean emailVerified,
    PlanId planId,
    BillingCycle billingCycle,
    long charactersUsed,
    long characterLimit,
    long bonusCharacters,
    SubscriptionStatus subscriptionStatus,
    boolean locked,
    int failedLoginAttempts,
    Instant createdAt) {

  public static AdminUserResponse from(User user) {
    long limit = PlanCatalog.get(user.getPlanId()).characterLimit() + user.getBonusCharacters();
    return new AdminUserResponse(
        user.getId(),
        user.getEmail(),
        user.getName(),
        user.getRole(),
        user.getProvider(),
        user.isEmailVerified(),
        user.getPlanId(),
        user.getBillingCycle(),
        user.getCharactersUsed(),
        limit,
        user.getBonusCharacters(),
        user.getSubscriptionStatus(),
        user.isLocked(),
        user.getFailedLoginAttempts(),
        user.getCreatedAt());
  }
}
