package app.nwm.server.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nwm.server.user.AuthProvider;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "app.stripe.enabled=true",
      "app.stripe.secret-key=sk_test_dummy",
      "app.stripe.webhook-secret=whsec_test_dummy_secret"
    })
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StripeWebhookControllerTest {

  private static final String WEBHOOK_SECRET = "whsec_test_dummy_secret";

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;

  private User createUser(String email) {
    User user = new User(email, "Test User", AuthProvider.LOCAL);
    user.setPasswordHash("unused");
    return userRepository.save(user);
  }

  private String topUpCompletedPayload(String eventId, UUID userId) {
    return """
        {
          "id": "%s",
          "object": "event",
          "api_version": "%s",
          "created": %d,
          "livemode": false,
          "pending_webhooks": 0,
          "type": "checkout.session.completed",
          "data": {
            "object": {
              "id": "cs_test_123",
              "object": "checkout.session",
              "mode": "payment",
              "client_reference_id": "%s",
              "metadata": {
                "userId": "%s",
                "topUpId": "small",
                "characters": "50000"
              }
            }
          }
        }
        """
        .formatted(eventId, com.stripe.Stripe.API_VERSION, Instant.now().getEpochSecond(), userId, userId);
  }

  private String signatureHeader(String payload) throws NoSuchAlgorithmException, InvalidKeyException {
    long timestamp = Instant.now().getEpochSecond();
    String signedPayload = timestamp + "." + payload;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    byte[] signature = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
    return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(signature);
  }

  @Test
  void rejectsInvalidSignature() throws Exception {
    mockMvc
        .perform(
            post("/api/billing/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", "t=123,v1=not-a-real-signature")
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void creditsTopUpOnValidSignatureAndIgnoresReplay() throws Exception {
    User user = createUser("topup-" + UUID.randomUUID() + "@example.com");
    String eventId = "evt_" + UUID.randomUUID();
    String payload = topUpCompletedPayload(eventId, user.getId());
    String signature = signatureHeader(payload);

    mockMvc
        .perform(
            post("/api/billing/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", signature)
                .content(payload))
        .andExpect(status().isOk());

    User afterFirst = userRepository.findById(user.getId()).orElseThrow();
    assertThat(afterFirst.getBonusCharacters()).isEqualTo(50_000);

    // Stripe redelivers events until it sees a 2xx — the same event id must
    // not credit the account twice.
    mockMvc
        .perform(
            post("/api/billing/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", signature)
                .content(payload))
        .andExpect(status().isOk());

    User afterReplay = userRepository.findById(user.getId()).orElseThrow();
    assertThat(afterReplay.getBonusCharacters()).isEqualTo(50_000);
  }
}
