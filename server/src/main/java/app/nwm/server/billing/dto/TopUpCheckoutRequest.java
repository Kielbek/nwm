package app.nwm.server.billing.dto;

import jakarta.validation.constraints.NotBlank;

public record TopUpCheckoutRequest(@NotBlank String topUpId) {}
