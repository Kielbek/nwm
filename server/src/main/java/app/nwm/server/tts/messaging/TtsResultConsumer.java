package app.nwm.server.tts.messaging;

import app.nwm.server.tts.TtsJobService;
import app.nwm.server.tts.messaging.dto.TtsResultMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Consumes {@code tts.generate.results}, published by the Python worker once a job finishes. */
@Component
@ConditionalOnProperty(prefix = "app.messaging", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TtsResultConsumer {

  private static final Logger log = LoggerFactory.getLogger(TtsResultConsumer.class);

  private final TtsJobService ttsJobService;

  public TtsResultConsumer(TtsJobService ttsJobService) {
    this.ttsJobService = ttsJobService;
  }

  @RabbitListener(queues = "#{@ttsResultQueue.name}")
  public void onResult(TtsResultMessage message) {
    boolean succeeded = "COMPLETED".equalsIgnoreCase(message.status());
    if (!succeeded && !"FAILED".equalsIgnoreCase(message.status())) {
      log.warn("Ignoring tts result with unknown status '{}' for job {}", message.status(), message.jobId());
      return;
    }

    log.info("Applying {} result for job {}", message.status(), message.jobId());
    ttsJobService.applyResult(
        message.jobId(), succeeded, message.audioS3Key(), message.durationSeconds(), message.errorMessage());
  }
}
