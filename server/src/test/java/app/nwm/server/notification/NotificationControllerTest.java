package app.nwm.server.notification;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  private String registerAndGetToken() throws Exception {
    String email = "notif-" + UUID.randomUUID() + "@example.com";
    MvcResult result =
        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", email, "password", "correct horse battery staple", "name", "Test"))))
            .andExpect(status().isCreated())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  @Test
  void registeringCreatesAWelcomeNotificationThatCanBeMarkedRead() throws Exception {
    String token = registerAndGetToken();

    MvcResult listResult =
        mockMvc
            .perform(get("/api/notifications").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].type").value("WELCOME"))
            .andExpect(jsonPath("$.content[0].read").value(false))
            .andReturn();

    mockMvc
        .perform(get("/api/notifications/unread-count").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(1));

    String notificationId =
        objectMapper.readTree(listResult.getResponse().getContentAsString()).get("content").get(0).get("id").asText();

    mockMvc
        .perform(post("/api/notifications/" + notificationId + "/read").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.read").value(true));

    mockMvc
        .perform(get("/api/notifications/unread-count").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(0));
  }

  @Test
  void listRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
  }
}
