package app.nwm.server.tts.dto;

import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.JobStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record JobResponse(
    UUID id,
    JobStatus status,
    String text,
    String voiceId,
    String modelId,
    String outputFormat,
    int characterCount,
    BigDecimal durationSeconds,
    String downloadUrl,
    String errorMessage,
    Instant createdAt) {

  public static JobResponse from(GenerationJob job, String downloadUrl) {
    return new JobResponse(
        job.getId(),
        job.getStatus(),
        job.getText(),
        job.getVoiceId(),
        job.getModelId(),
        job.getOutputFormat(),
        job.getCharacterCount(),
        job.getDurationSeconds(),
        downloadUrl,
        job.getErrorMessage(),
        job.getCreatedAt());
  }
}
