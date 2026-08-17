package app.nwm.server.admin.dto;

import app.nwm.server.plan.PlanId;
import jakarta.validation.constraints.NotNull;

public record SetPlanRequest(@NotNull PlanId planId) {}
