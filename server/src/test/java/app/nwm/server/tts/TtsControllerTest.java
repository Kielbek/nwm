package app.nwm.server.tts;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nwm.server.plan.PlanId;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import app.nwm.server.user.AuthProvider;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TtsControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  private String registerAndLogin(String email, PlanId plan, long charactersAlreadyUsed) throws Exception {
    User user = new User(email, "Test User", AuthProvider.LOCAL);
    user.setPasswordHash(passwordEncoder.encode("correct horse battery staple"));
    user.setPlanId(plan);
    user.setCharactersUsed(charactersAlreadyUsed);
    userRepository.save(user);

    var result =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", email, "password", "correct horse battery staple"))))
            .andExpect(status().isOk())
            .andReturn();

    return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  private Map<String, Object> synthesizePayload(String text) {
    return Map.of(
        "text", text,
        "voiceId", "marek",
        "modelId", "standard",
        "outputFormat", "mp3-128",
        "settings",
            Map.of(
                "speed", 1.0,
                "stability", 0.5,
                "similarity", 0.85,
                "styleExaggeration", 0.0,
                "languageOverride", false));
  }

  @Test
  void synthesizeWithinQuotaIsAccepted() throws Exception {
    String token = registerAndLogin("free-" + UUID.randomUUID() + "@example.com", PlanId.FREE, 0);

    mockMvc
        .perform(
            post("/api/tts/synthesize")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(synthesizePayload("Hello there"))))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.status").value("PENDING"));
  }

  @Test
  void synthesizeOverQuotaIsRejected() throws Exception {
    // FREE plan allows 10,000 characters — start already at the limit.
    String token = registerAndLogin("maxed-" + UUID.randomUUID() + "@example.com", PlanId.FREE, 10_000);

    mockMvc
        .perform(
            post("/api/tts/synthesize")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(synthesizePayload("One more word"))))
        .andExpect(status().isPaymentRequired());
  }

  @Test
  void synthesizeWithoutAuthIsRejected() throws Exception {
    mockMvc
        .perform(
            post("/api/tts/synthesize")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(synthesizePayload("Hello there"))))
        .andExpect(status().isUnauthorized());
  }
}
