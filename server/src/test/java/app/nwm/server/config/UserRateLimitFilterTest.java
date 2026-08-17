package app.nwm.server.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nwm.server.plan.PlanId;
import app.nwm.server.user.AuthProvider;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserRateLimitFilterTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @Test
  void thirdRequestWithinAMinuteIsRejectedOncePerUserCapacityIsExhausted() throws Exception {
    // application-test.yml sets app.rate-limit.user-capacity to 2.
    String email = "rate-limited-" + UUID.randomUUID() + "@example.com";
    User user = new User(email, "Test User", AuthProvider.LOCAL);
    user.setPasswordHash(passwordEncoder.encode("correct horse battery staple"));
    user.setPlanId(PlanId.PRO);
    userRepository.save(user);

    var loginResult =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", email, "password", "correct horse battery staple"))))
            .andExpect(status().isOk())
            .andReturn();
    String token =
        objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("accessToken").asText();

    for (int i = 0; i < 2; i++) {
      mockMvc
          .perform(
              post("/api/tts/synthesize")
                  .header("Authorization", "Bearer " + token)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(synthesizePayload("Request " + i))))
          .andExpect(status().isAccepted());
    }

    mockMvc
        .perform(
            post("/api/tts/synthesize")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(synthesizePayload("One too many"))))
        .andExpect(status().isTooManyRequests());
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
}
