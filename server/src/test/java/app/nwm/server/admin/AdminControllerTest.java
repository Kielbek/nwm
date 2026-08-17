package app.nwm.server.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nwm.server.plan.PlanId;
import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.GenerationJobRepository;
import app.nwm.server.tts.JobStatus;
import app.nwm.server.user.AuthProvider;
import app.nwm.server.user.Role;
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
class AdminControllerTest {

  private static final String PASSWORD = "correct horse battery staple";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;
  @Autowired private GenerationJobRepository generationJobRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  private User createUser(Role role) {
    User user = new User(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.com", "Test", AuthProvider.LOCAL);
    user.setPasswordHash(passwordEncoder.encode(PASSWORD));
    user.setRole(role);
    return userRepository.save(user);
  }

  private String login(User user) throws Exception {
    var result =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", user.getEmail(), "password", PASSWORD))))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  @Test
  void nonAdminUserIsForbiddenFromAdminEndpoints() throws Exception {
    String token = login(createUser(Role.USER));

    mockMvc
        .perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Test
  void adminCanListAndSearchUsersAndGrantCharactersAndSetPlan() throws Exception {
    String adminToken = login(createUser(Role.ADMIN));
    User target = createUser(Role.USER);

    mockMvc
        .perform(
            get("/api/admin/users")
                .param("query", target.getEmail())
                .header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].email").value(target.getEmail()));

    mockMvc
        .perform(get("/api/admin/users/" + target.getId()).header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.bonusCharacters").value(0));

    mockMvc
        .perform(
            post("/api/admin/users/" + target.getId() + "/grant-characters")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("amount", 5000))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.bonusCharacters").value(5000));

    mockMvc
        .perform(
            post("/api/admin/users/" + target.getId() + "/plan")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("planId", "PRO"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planId").value("PRO"));
  }

  @Test
  void adminCanListJobsFilteredByStatus() throws Exception {
    String adminToken = login(createUser(Role.ADMIN));
    User jobOwner = createUser(Role.USER);
    generationJobRepository.save(
        new GenerationJob(jobOwner, "hello", "marek", "standard", "mp3-128", "{}", 5));

    mockMvc
        .perform(
            get("/api/admin/jobs")
                .param("status", JobStatus.PENDING.name())
                .header("Authorization", "Bearer " + adminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].userEmail").value(jobOwner.getEmail()));
  }
}
