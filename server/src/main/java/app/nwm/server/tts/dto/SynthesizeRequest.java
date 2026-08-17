package app.nwm.server.tts.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SynthesizeRequest(
    @NotBlank @Size(max = 5000) String text,
    @NotBlank String voiceId,
    @NotBlank String modelId,
    @NotBlank String outputFormat,
    @NotNull @Valid TtsSettingsPayload settings) {}
