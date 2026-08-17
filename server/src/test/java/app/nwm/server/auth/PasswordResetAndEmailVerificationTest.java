package app.nwm.server.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nwm.server.email.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetAndEmailVerificationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @MockBean private EmailService emailService;

  private String uniqueEmail() {
    return "user-" + UUID.randomUUID() + "@example.com";
  }

  private String register(String email, String password) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", email, "password", password, "name", "Test User"))))
            .andExpect(status().isCreated())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  private String tokenFromLink(String link) {
    int idx = link.indexOf("token=");
    return URLDecoder.decode(link.substring(idx + "token=".length()), StandardCharsets.UTF_8);
  }

  @Test
  void forgotPasswordIssuesSingleUseTokenThatResetsPassword() throws Exception {
    String email = uniqueEmail();
    String oldPassword = "correct horse battery staple";
    String newPassword = "battery staple correct horse";
    register(email, oldPassword);

    mockMvc
        .perform(
            post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email))))
        .andExpect(status().isOk());

    ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailService).sendPasswordReset(eq(email), linkCaptor.capture());
    String token = tokenFromLink(linkCaptor.getValue());

    mockMvc
        .perform(
            post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("token", token, "newPassword", newPassword))))
        .andExpect(status().isOk());

    // The old password no longer works, the new one does.
    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", oldPassword))))
        .andExpect(status().isUnauthorized());

    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", newPassword))))
        .andExpect(status().isOk());

    // The reset token is single-use.
    mockMvc
        .perform(
            post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(Map.of("token", token, "newPassword", "yet another one"))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void forgotPasswordForUnknownEmailStillReturnsOkWithoutSendingEmail() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", uniqueEmail()))))
        .andExpect(status().isOk());

    verify(emailService, never()).sendPasswordReset(any(), any());
  }

  @Test
  void registrationTriggersVerificationEmailAndTokenConfirmsIt() throws Exception {
    String email = uniqueEmail();
    String accessToken = register(email, "correct horse battery staple");

    mockMvc
        .perform(get("/api/users/me").header("Authorization", "Bearer " + accessToken))
        .andExpect(status().isOk())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.emailVerified")
                .value(false));

    ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailService).sendEmailVerification(eq(email), linkCaptor.capture());
    String token = tokenFromLink(linkCaptor.getValue());

    mockMvc
        .perform(
            post("/api/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("token", token))))
        .andExpect(status().isOk());

    mockMvc
        .perform(get("/api/users/me").header("Authorization", "Bearer " + accessToken))
        .andExpect(status().isOk())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.emailVerified")
                .value(true));

    // Single use — reusing the same token fails.
    mockMvc
        .perform(
            post("/api/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("token", token))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void resendVerificationEmailRequiresAuthentication() throws Exception {
    mockMvc.perform(post("/api/auth/verify-email/resend")).andExpect(status().isUnauthorized());
  }

  @Test
  void invalidResetTokenIsRejected() throws Exception {
    mockMvc
        .perform(
            post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        Map.of("token", "not-a-real-token", "newPassword", "whatever new password"))))
        .andExpect(status().isBadRequest());
  }
}
