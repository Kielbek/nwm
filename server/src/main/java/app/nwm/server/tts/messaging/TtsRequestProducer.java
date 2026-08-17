package app.nwm.server.tts.messaging;

import app.nwm.server.config.AppProperties;
import app.nwm.server.config.RabbitMqConfig;
import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.dto.TtsSettingsPayload;
import app.nwm.server.tts.messaging.dto.TtsJobMessage;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.messaging", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TtsRequestProducer {

  private final RabbitTemplate rabbitTemplate;
  private final AppProperties.Storage storage;

  public TtsRequestProducer(RabbitTemplate rabbitTemplate, AppProperties properties) {
    this.rabbitTemplate = rabbitTemplate;
    this.storage = properties.storage();
  }

  public void publish(GenerationJob job, TtsSettingsPayload settings) {
    TtsJobMessage message =
        new TtsJobMessage(
            job.getId(),
            job.getText(),
            job.getVoiceId(),
            job.getModelId(),
            job.getOutputFormat(),
            new TtsJobMessage.SettingsPayload(
                settings.speed(),
                settings.stability(),
                settings.similarity(),
                settings.styleExaggeration(),
                settings.languageOverride()),
            storage.bucket(),
            "generations/" + job.getUser().getId());

    rabbitTemplate.convertAndSend(RabbitMqConfig.ROUTING_KEY_REQUEST, message);
  }
}
