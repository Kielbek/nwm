package app.nwm.server.folder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.GenerationJobRepository;
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

/**
 * The test profile deliberately caps the per-user TTS rate-limit bucket at 2
 * (see application-test.yml) so UserRateLimitFilterTest can trip it quickly —
 * that means any single test here can make at most 2 calls under /api/tts/**
 * per user. Tests that would need a 3rd (e.g. verifying a folder filter after
 * synthesizing + moving a job) seed that intermediate state directly through
 * the repository instead of through the rate-limited move endpoint, or use a
 * fresh user. /api/folders/** itself isn't rate-limited.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FolderControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;
  @Autowired private GenerationJobRepository generationJobRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  private String registerAndLogin(String email) throws Exception {
    User user = new User(email, "Test User", AuthProvider.LOCAL);
    user.setPasswordHash(passwordEncoder.encode("correct horse battery staple"));
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

  private String synthesize(String token, String text) throws Exception {
    Map<String, Object> payload =
        Map.of(
            "text", text,
            "voiceId", "marek",
            "modelId", "natural",
            "outputFormat", "mp3-128",
            "settings",
                Map.of(
                    "speed", 1.0,
                    "stability", 0.5,
                    "similarity", 0.85,
                    "styleExaggeration", 0.0,
                    "languageOverride", false));

    var result =
        mockMvc
            .perform(
                post("/api/tts/synthesize")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isAccepted())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }

  private String createFolder(String token, String name) throws Exception {
    var result =
        mockMvc
            .perform(
                post("/api/folders")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("name", name))))
            .andExpect(status().isCreated())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }

  @Test
  void createListRenameAndDeleteFolder() throws Exception {
    String token = registerAndLogin("folders-" + UUID.randomUUID() + "@example.com");

    String folderId = createFolder(token, "Podcasty");

    mockMvc
        .perform(get("/api/folders").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(folderId))
        .andExpect(jsonPath("$[0].jobCount").value(0));

    mockMvc
        .perform(
            patch("/api/folders/" + folderId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "Odcinki"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Odcinki"));

    mockMvc
        .perform(delete("/api/folders/" + folderId).header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/folders").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void movingJobToFolderSetsFolderIdAndUpdatesJobCount() throws Exception {
    String token = registerAndLogin("move-" + UUID.randomUUID() + "@example.com");
    String jobId = synthesize(token, "Hello there");
    String folderId = createFolder(token, "Projekt A");

    mockMvc
        .perform(
            patch("/api/tts/jobs/" + jobId + "/folder")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("folderId", folderId))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.folderId").value(folderId));

    mockMvc
        .perform(get("/api/folders").header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$[0].jobCount").value(1));
  }

  @Test
  void historyCanBeFilteredByFolder() throws Exception {
    String token = registerAndLogin("filter-" + UUID.randomUUID() + "@example.com");
    String jobId = synthesize(token, "Hello there");
    String folderId = createFolder(token, "Projekt B");

    // Seeded directly rather than through PATCH .../folder (already covered
    // above) — synthesize + move + a filtered history call would be 3 calls
    // under /api/tts/** for one user, past the test profile's tiny bucket.
    GenerationJob job = generationJobRepository.findById(UUID.fromString(jobId)).orElseThrow();
    job.moveToFolder(UUID.fromString(folderId));
    generationJobRepository.save(job);

    mockMvc
        .perform(
            get("/api/tts/history")
                .param("folderId", folderId)
                .header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].id").value(jobId));
  }

  @Test
  void deletingFolderUnfilesItsJobsRatherThanDeletingThem() throws Exception {
    String token = registerAndLogin("delete-" + UUID.randomUUID() + "@example.com");
    String jobId = synthesize(token, "Hello there");
    String folderId = createFolder(token, "Projekt C");

    mockMvc
        .perform(
            patch("/api/tts/jobs/" + jobId + "/folder")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("folderId", folderId))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.folderId").value(folderId));

    mockMvc
        .perform(delete("/api/folders/" + folderId).header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    GenerationJob job = generationJobRepository.findById(UUID.fromString(jobId)).orElseThrow();
    assertThat(job.getFolderId()).isNull();
  }

  @Test
  void movingJobIntoSomeoneElsesFolderIsRejected() throws Exception {
    String ownerToken = registerAndLogin("owner-" + UUID.randomUUID() + "@example.com");
    String intruderToken = registerAndLogin("intruder-" + UUID.randomUUID() + "@example.com");

    String folderId = createFolder(ownerToken, "Prywatne");
    String jobId = synthesize(intruderToken, "Hello there");

    mockMvc
        .perform(
            patch("/api/tts/jobs/" + jobId + "/folder")
                .header("Authorization", "Bearer " + intruderToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("folderId", folderId))))
        .andExpect(status().isNotFound());
  }

  @Test
  void folderEndpointsWithoutAuthAreRejected() throws Exception {
    mockMvc.perform(get("/api/folders")).andExpect(status().isUnauthorized());
  }
}
