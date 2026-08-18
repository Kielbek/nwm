package app.nwm.server.tts.messaging;

import app.nwm.server.tts.TtsJobService;
import app.nwm.server.tts.messaging.dto.TtsChunkMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Consumes {@code tts.generate.chunks}, published by the Python worker as
 * each text segment of a job finishes synthesizing (ahead of the final
 * {@code tts.generate.results} message for the whole job).
 */
@Component
@ConditionalOnProperty(prefix = "app.messaging", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TtsChunkConsumer {

  private static final Logger log = LoggerFactory.getLogger(TtsChunkConsumer.class);

  private final TtsJobService ttsJobService;

  public TtsChunkConsumer(TtsJobService ttsJobService) {
    this.ttsJobService = ttsJobService;
  }

  @RabbitListener(queues = "#{@ttsChunkQueue.name}")
  public void onChunk(TtsChunkMessage message) {
    log.debug(
        "Applying chunk {}/{} for job {}", message.chunkIndex() + 1, message.totalChunks(), message.jobId());
    ttsJobService.applyChunk(
        message.jobId(),
        message.chunkIndex(),
        message.totalChunks(),
        message.audioS3Key(),
        message.durationSeconds());
  }
}
