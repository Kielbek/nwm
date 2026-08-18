package app.nwm.server.tts.dto;

import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.JobStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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
    Instant createdAt,
    UUID folderId,
    List<ChunkResponse> chunks) {

  public static JobResponse from(GenerationJob job, String downloadUrl, List<ChunkResponse> chunks) {
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
        job.getCreatedAt(),
        job.getFolderId(),
        chunks);
  }

  /** One playable segment of the job, in order — the frontend player plays these sequentially. */
  public record ChunkResponse(int index, int total, String url, BigDecimal durationSeconds) {}
}
