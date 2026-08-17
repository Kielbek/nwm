package app.nwm.server.admin.dto;

import jakarta.validation.constraints.Positive;

public record GrantCharactersRequest(@Positive long amount) {}
