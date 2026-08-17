package app.nwm.server.billing;

import app.nwm.server.config.AppProperties;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stripe webhooks are the one endpoint in this API that is neither
 * cookie/JWT-authenticated nor CSRF-relevant — trust comes entirely from
 * verifying the {@code Stripe-Signature} header against the raw request
 * body, which is why this reads the body manually instead of letting
 * Spring deserialize it (deserializing first would make the exact bytes
 * Stripe signed unrecoverable, and the signature check would fail).
 */
@RestController
@RequestMapping("/api/billing")
@ConditionalOnProperty(prefix = "app.stripe", name = "enabled", havingValue = "true", matchIfMissing = true)
public class StripeWebhookController {

  private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

  private final StripeWebhookService webhookService;
  private final String webhookSecret;

  public StripeWebhookController(StripeWebhookService webhookService, AppProperties properties) {
    this.webhookService = webhookService;
    this.webhookSecret = properties.stripe().webhookSecret();
  }

  @PostMapping("/webhook")
  public ResponseEntity<Void> webhook(
      HttpServletRequest request, @RequestHeader("Stripe-Signature") String signatureHeader)
      throws IOException {
    String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

    Event event;
    try {
      event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
    } catch (SignatureVerificationException e) {
      log.warn("Rejected Stripe webhook with invalid signature: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    webhookService.handle(event);
    return ResponseEntity.ok().build();
  }
}
