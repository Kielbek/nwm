package app.nwm.server.auth.dto;

import app.nwm.server.user.dto.UserResponse;

public record AuthResponse(String accessToken, long expiresInSeconds, UserResponse user) {}
