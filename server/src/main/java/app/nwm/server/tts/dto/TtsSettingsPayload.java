package app.nwm.server.tts.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record TtsSettingsPayload(
    @DecimalMin("0.5") @DecimalMax("2.0") double speed,
    @DecimalMin("0.0") @DecimalMax("1.0") double stability,
    @DecimalMin("0.0") @DecimalMax("1.0") double similarity,
    @DecimalMin("0.0") @DecimalMax("1.0") double styleExaggeration,
    boolean languageOverride) {}
