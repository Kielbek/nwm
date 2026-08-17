package app.nwm.server.tts.messaging.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published by the Python worker to {@code tts.generate.results} once it
 * finishes (or fails) a job. {@code status} is either {@code "COMPLETED"}
 * or {@code "FAILED"} — anything else is rejected by the consumer.
 */
public record TtsResultMessage(
    UUID jobId,
    String status,
    String audioS3Key,
    BigDecimal durationSeconds,
    String errorMessage) {}
