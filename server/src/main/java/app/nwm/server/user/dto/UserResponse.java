package app.nwm.server.user.dto;

import app.nwm.server.plan.BillingCycle;
import app.nwm.server.plan.PlanCatalog;
import app.nwm.server.plan.PlanId;
import app.nwm.server.user.User;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String name,
    String avatarUrl,
    boolean emailVerified,
    PlanId planId,
    BillingCycle billingCycle,
    long charactersUsed,
    long characterLimit,
    long bonusCharacters) {

  public static UserResponse from(User user) {
    long limit = PlanCatalog.get(user.getPlanId()).characterLimit() + user.getBonusCharacters();
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getName(),
        user.getAvatarUrl(),
        user.isEmailVerified(),
        user.getPlanId(),
        user.getBillingCycle(),
        user.getCharactersUsed(),
        limit,
        user.getBonusCharacters());
  }
}
