package app.nwm.server.auth;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
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
class AuthControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  private String uniqueEmail() {
    return "user-" + UUID.randomUUID() + "@example.com";
  }

  @Test
  void registerThenLoginThenRefreshThenLogout() throws Exception {
    String email = uniqueEmail();
    String password = "correct horse battery staple";

    // Register
    MvcResult registerResult =
        mockMvc
            .perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", email, "password", password, "name", "Test User"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.accessToken", notNullValue()))
            .andExpect(jsonPath("$.user.email").value(email))
            .andReturn();

    Cookie registerRefreshCookie = registerResult.getResponse().getCookie(AuthCookies.REFRESH_COOKIE_NAME);
    assert registerRefreshCookie != null;

    // Registering the same email again is rejected
    mockMvc
        .perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        Map.of("email", email, "password", password, "name", "Dupe"))))
        .andExpect(status().isConflict());

    // Wrong password is rejected
    mockMvc
        .perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", "wrong"))))
        .andExpect(status().isUnauthorized());

    // Correct login succeeds
    MvcResult loginResult =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", notNullValue()))
            .andReturn();

    Cookie loginRefreshCookie = loginResult.getResponse().getCookie(AuthCookies.REFRESH_COOKIE_NAME);
    assert loginRefreshCookie != null;

    // Refresh rotates the token and issues a new access token
    MvcResult refreshResult =
        mockMvc
            .perform(post("/api/auth/refresh").cookie(loginRefreshCookie))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", notNullValue()))
            .andReturn();

    // The old (now-rotated) refresh token can no longer be used
    mockMvc.perform(post("/api/auth/refresh").cookie(loginRefreshCookie)).andExpect(status().isUnauthorized());

    Cookie refreshedCookie = refreshResult.getResponse().getCookie(AuthCookies.REFRESH_COOKIE_NAME);
    assert refreshedCookie != null;

    String accessToken =
        objectMapper.readTree(refreshResult.getResponse().getContentAsString()).get("accessToken").asText();

    // Logout revokes every outstanding refresh token for the user
    mockMvc
        .perform(post("/api/auth/logout").header("Authorization", "Bearer " + accessToken))
        .andExpect(status().isNoContent());

    mockMvc.perform(post("/api/auth/refresh").cookie(refreshedCookie)).andExpect(status().isUnauthorized());
  }

  @Test
  void refreshWithoutCookieIsRejected() throws Exception {
    mockMvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
  }
}
