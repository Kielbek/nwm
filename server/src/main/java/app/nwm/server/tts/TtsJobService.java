package app.nwm.server.tts;

import app.nwm.server.common.ApiException;
import app.nwm.server.notification.NotificationService;
import app.nwm.server.notification.NotificationType;
import app.nwm.server.plan.PlanCatalog;
import app.nwm.server.storage.S3StorageService;
import app.nwm.server.tts.dto.JobResponse;
import app.nwm.server.tts.dto.SynthesizeRequest;
import app.nwm.server.tts.dto.TtsSettingsPayload;
import app.nwm.server.tts.messaging.TtsRequestProducer;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;

@Service
public class TtsJobService {

  private static final Logger log = LoggerFactory.getLogger(TtsJobService.class);

  private final GenerationJobRepository generationJobRepository;
  private final UserRepository userRepository;
  private final S3StorageService s3StorageService;
  private final ObjectMapper objectMapper;
  private final Optional<TtsRequestProducer> requestProducer;
  private final NotificationService notificationService;

  public TtsJobService(
      GenerationJobRepository generationJobRepository,
      UserRepository userRepository,
      S3StorageService s3StorageService,
      ObjectMapper objectMapper,
      Optional<TtsRequestProducer> requestProducer,
      NotificationService notificationService) {
    this.generationJobRepository = generationJobRepository;
    this.userRepository = userRepository;
    this.s3StorageService = s3StorageService;
    this.objectMapper = objectMapper;
    this.requestProducer = requestProducer;
    this.notificationService = notificationService;
  }

  @Transactional
  public JobResponse synthesize(UUID userId, SynthesizeRequest request) {
    User user =
        userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));

    int characterCount = request.text().length();
    long limit = PlanCatalog.get(user.getPlanId()).characterLimit() + user.getBonusCharacters();
    if (user.getCharactersUsed() + characterCount > limit) {
      throw ApiException.quotaExceeded(
          "This request would exceed your plan's character quota. Upgrade your plan or buy a top-up.");
    }

    GenerationJob job =
        new GenerationJob(
            user,
            request.text(),
            request.voiceId(),
            request.modelId(),
            request.outputFormat(),
            writeSettingsJson(request.settings()),
            characterCount);
    job = generationJobRepository.save(job);

    // Reserved eagerly so concurrent requests can't both slip in under the
    // quota; a failed job refunds this back in TtsResultConsumer.
    user.setCharactersUsed(user.getCharactersUsed() + characterCount);
    userRepository.save(user);

    if (requestProducer.isPresent()) {
      requestProducer.get().publish(job, request.settings());
    } else {
      log.warn("Messaging disabled — job {} was persisted but never dispatched to a worker", job.getId());
    }

    return JobResponse.from(job, null);
  }

  @Transactional(readOnly = true)
  public JobResponse getJob(UUID userId, UUID jobId) {
    GenerationJob job =
        generationJobRepository
            .findByIdAndUserId(jobId, userId)
            .orElseThrow(() -> ApiException.notFound("Job not found"));
    String downloadUrl =
        job.getAudioS3Key() != null
            ? s3StorageService.presignDownloadUrl(job.getAudioS3Key()).toString()
            : null;
    return JobResponse.from(job, downloadUrl);
  }

  @Transactional(readOnly = true)
  public Page<JobResponse> listHistory(UUID userId, Pageable pageable) {
    return generationJobRepository
        .findByUserIdOrderByCreatedAtDesc(userId, pageable)
        .map(
            job -> {
              String downloadUrl =
                  job.getAudioS3Key() != null
                      ? s3StorageService.presignDownloadUrl(job.getAudioS3Key()).toString()
                      : null;
              return JobResponse.from(job, downloadUrl);
            });
  }

  @Transactional
  public void applyResult(UUID jobId, boolean succeeded, String audioS3Key, BigDecimal durationSeconds, String errorMessage) {
    GenerationJob job = generationJobRepository.findById(jobId).orElse(null);
    if (job == null) {
      log.warn("Received a result for unknown job {}", jobId);
      return;
    }

    if (succeeded) {
      job.markCompleted(audioS3Key, durationSeconds);
    } else {
      job.markFailed(errorMessage);
      refundCharacters(job);
      notificationService.notify(
          job.getUser(),
          NotificationType.GENERATION_FAILED,
          "Generowanie nie powiodło się",
          "Nie udało się wygenerować mowy dla jednego z Twoich tekstów. Znaki zostały zwrócone na Twoje konto.",
          "/app/history");
    }
    generationJobRepository.save(job);
  }

  private void refundCharacters(GenerationJob job) {
    User user = job.getUser();
    user.setCharactersUsed(Math.max(0, user.getCharactersUsed() - job.getCharacterCount()));
    userRepository.save(user);
  }

  private String writeSettingsJson(TtsSettingsPayload settings) {
    try {
      return objectMapper.writeValueAsString(settings);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Failed to serialize TTS settings", e);
    }
  }
}
