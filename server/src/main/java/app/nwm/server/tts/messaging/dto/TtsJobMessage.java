package app.nwm.server.tts.messaging.dto;

import java.util.UUID;

/**
 * Published to the {@code tts.generate.requests} queue for the Python
 * worker to consume. Keep this shape stable — it's the cross-language
 * contract between this API and the worker.
 */
public record TtsJobMessage(
    UUID jobId,
    String text,
    String voiceId,
    String modelId,
    String outputFormat,
    SettingsPayload settings,
    String s3Bucket,
    String resultObjectKeyPrefix) {

  public record SettingsPayload(
      double speed,
      double stability,
      double similarity,
      double styleExaggeration,
      boolean languageOverride) {}
}
