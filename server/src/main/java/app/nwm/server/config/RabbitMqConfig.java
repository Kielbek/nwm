package app.nwm.server.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the exchange/queues that bridge this API to the Python TTS
 * worker. The whole messaging layer can be switched off (e.g. for a
 * dockerless local run against H2 with no broker available) via
 * {@code app.messaging.enabled=false}.
 */
@Configuration
@ConditionalOnProperty(prefix = "app.messaging", name = "enabled", havingValue = "true", matchIfMissing = true)
public class RabbitMqConfig {

  public static final String ROUTING_KEY_REQUEST = "tts.request";
  public static final String ROUTING_KEY_RESULT = "tts.result";
  public static final String ROUTING_KEY_CHUNK = "tts.chunk";

  private final AppProperties.Messaging messaging;

  public RabbitMqConfig(AppProperties properties) {
    this.messaging = properties.messaging();
  }

  @Bean
  public DirectExchange ttsExchange() {
    return new DirectExchange(messaging.ttsExchange(), true, false);
  }

  @Bean
  public Queue ttsRequestQueue() {
    return QueueBuilder.durable(messaging.ttsRequestQueue())
        .withArgument("x-dead-letter-exchange", "")
        .withArgument("x-dead-letter-routing-key", messaging.ttsDlq())
        .build();
  }

  @Bean
  public Queue ttsResultQueue() {
    return QueueBuilder.durable(messaging.ttsResultQueue()).build();
  }

  @Bean
  public Queue ttsChunkQueue() {
    return QueueBuilder.durable(messaging.ttsChunkQueue()).build();
  }

  @Bean
  public Queue ttsDeadLetterQueue() {
    return QueueBuilder.durable(messaging.ttsDlq()).build();
  }

  @Bean
  public Binding ttsRequestBinding() {
    return BindingBuilder.bind(ttsRequestQueue()).to(ttsExchange()).with(ROUTING_KEY_REQUEST);
  }

  @Bean
  public Binding ttsResultBinding() {
    return BindingBuilder.bind(ttsResultQueue()).to(ttsExchange()).with(ROUTING_KEY_RESULT);
  }

  @Bean
  public Binding ttsChunkBinding() {
    return BindingBuilder.bind(ttsChunkQueue()).to(ttsExchange()).with(ROUTING_KEY_CHUNK);
  }

  @Bean
  public MessageConverter jsonMessageConverter(ObjectMapper objectMapper) {
    return new Jackson2JsonMessageConverter(objectMapper);
  }

  @Bean
  public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter converter) {
    RabbitTemplate template = new RabbitTemplate(connectionFactory);
    template.setMessageConverter(converter);
    template.setExchange(messaging.ttsExchange());
    return template;
  }
}
