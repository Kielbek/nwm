package app.nwm.server.admin.dto;

import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.JobStatus;
import java.time.Instant;
import java.util.UUID;

public record AdminJobResponse(
    UUID id,
    UUID userId,
    String userEmail,
    JobStatus status,
    int characterCount,
    String errorMessage,
    Instant createdAt) {

  public static AdminJobResponse from(GenerationJob job) {
    return new AdminJobResponse(
        job.getId(),
        job.getUser().getId(),
        job.getUser().getEmail(),
        job.getStatus(),
        job.getCharacterCount(),
        job.getErrorMessage(),
        job.getCreatedAt());
  }
}
