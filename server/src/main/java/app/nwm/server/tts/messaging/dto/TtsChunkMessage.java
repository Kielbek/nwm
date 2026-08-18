package app.nwm.server.tts.messaging.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published by the Python worker to {@code tts.generate.chunks} as soon as
 * each text segment finishes synthesizing — lets the frontend start
 * playback before the whole job (which can take minutes for long texts) is
 * done. The worker still publishes a final {@link TtsResultMessage} once
 * every chunk is synthesized and the combined file is uploaded, same as
 * before this existed.
 */
public record TtsChunkMessage(
    UUID jobId, int chunkIndex, int totalChunks, String audioS3Key, BigDecimal durationSeconds) {}
