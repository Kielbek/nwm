package app.nwm.server.tts.dto;

import java.util.UUID;

/** `folderId` null unfiles the job back to the top-level "All" view. */
public record MoveJobRequest(UUID folderId) {}
