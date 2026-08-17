package app.nwm.server.billing.dto;

import app.nwm.server.plan.BillingCycle;
import app.nwm.server.plan.PlanId;
import jakarta.validation.constraints.NotNull;

public record SubscriptionCheckoutRequest(@NotNull PlanId planId, @NotNull BillingCycle billingCycle) {}
