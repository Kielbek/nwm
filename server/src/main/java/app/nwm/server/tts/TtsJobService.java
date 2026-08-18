package app.nwm.server.tts;

import app.nwm.server.common.ApiException;
import app.nwm.server.notification.NotificationService;
import app.nwm.server.notification.NotificationType;
import app.nwm.server.plan.PlanCatalog;
import app.nwm.server.storage.S3StorageService;
import app.nwm.server.tts.dto.JobResponse;
import app.nwm.server.tts.dto.JobResponse.ChunkResponse;
import app.nwm.server.tts.dto.SynthesizeRequest;
import app.nwm.server.tts.dto.TtsSettingsPayload;
import app.nwm.server.tts.messaging.TtsRequestProducer;
import app.nwm.server.tts.messaging.TtsStreamRegistry;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;

@Service
public class TtsJobService {

  private static final Logger log = LoggerFactory.getLogger(TtsJobService.class);

  private final GenerationJobRepository generationJobRepository;
  private final GenerationJobChunkRepository generationJobChunkRepository;
  private final UserRepository userRepository;
  private final S3StorageService s3StorageService;
  private final ObjectMapper objectMapper;
  private final Optional<TtsRequestProducer> requestProducer;
  private final NotificationService notificationService;
  private final TtsStreamRegistry streamRegistry;

  public TtsJobService(
      GenerationJobRepository generationJobRepository,
      GenerationJobChunkRepository generationJobChunkRepository,
      UserRepository userRepository,
      S3StorageService s3StorageService,
      ObjectMapper objectMapper,
      Optional<TtsRequestProducer> requestProducer,
      NotificationService notificationService,
      TtsStreamRegistry streamRegistry) {
    this.generationJobRepository = generationJobRepository;
    this.generationJobChunkRepository = generationJobChunkRepository;
    this.userRepository = userRepository;
    this.s3StorageService = s3StorageService;
    this.objectMapper = objectMapper;
    this.requestProducer = requestProducer;
    this.notificationService = notificationService;
    this.streamRegistry = streamRegistry;
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

    return JobResponse.from(job, null, List.of());
  }

  @Transactional(readOnly = true)
  public JobResponse getJob(UUID userId, UUID jobId) {
    GenerationJob job =
        generationJobRepository
            .findByIdAndUserId(jobId, userId)
            .orElseThrow(() -> ApiException.notFound("Job not found"));
    return toJobResponse(job);
  }

  @Transactional(readOnly = true)
  public Page<JobResponse> listHistory(UUID userId, Pageable pageable) {
    return generationJobRepository
        .findByUserIdOrderByCreatedAtDesc(userId, pageable)
        .map(this::toJobResponse);
  }

  /**
   * Opens an SSE connection for a job's progress. Any chunks already
   * persisted (the worker may have raced ahead of the browser's connect)
   * are replayed immediately; further chunks and the final "done" event
   * arrive as TtsChunkConsumer/TtsResultConsumer process worker messages.
   */
  @Transactional(readOnly = true)
  public SseEmitter streamJob(UUID userId, UUID jobId) {
    GenerationJob job =
        generationJobRepository
            .findByIdAndUserId(jobId, userId)
            .orElseThrow(() -> ApiException.notFound("Job not found"));

    SseEmitter emitter = streamRegistry.register(job.getId());
    List<GenerationJobChunk> existingChunks =
        generationJobChunkRepository.findByJobIdOrderByChunkIndexAsc(job.getId());
    for (GenerationJobChunk chunk : existingChunks) {
      streamRegistry.replayChunk(job.getId(), emitter, toChunkResponse(chunk));
    }

    if (job.getStatus() == JobStatus.COMPLETED || job.getStatus() == JobStatus.FAILED) {
      streamRegistry.completeImmediately(job.getId(), emitter, toJobResponse(job, existingChunks));
    }
    return emitter;
  }

  @Transactional
  public void applyChunk(
      UUID jobId, int chunkIndex, int totalChunks, String audioS3Key, BigDecimal durationSeconds) {
    GenerationJob job = generationJobRepository.findById(jobId).orElse(null);
    if (job == null) {
      log.warn("Received a chunk for unknown job {}", jobId);
      return;
    }
    if (generationJobChunkRepository.existsByJobIdAndChunkIndex(jobId, chunkIndex)) {
      // Redelivery (e.g. a redelivered-but-already-processed message) — the
      // chunk is already persisted and was already broadcast, skip it.
      return;
    }

    if (job.getStatus() == JobStatus.PENDING) {
      job.markProcessing();
      generationJobRepository.save(job);
    }

    GenerationJobChunk chunk =
        new GenerationJobChunk(job, chunkIndex, totalChunks, audioS3Key, durationSeconds);
    generationJobChunkRepository.save(chunk);
    streamRegistry.emitChunk(jobId, toChunkResponse(chunk));
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
    streamRegistry.completeAll(jobId, toJobResponse(job));
  }

  /** Proxied download — see S3StorageService.downloadBytes for why this isn't just a presigned URL. */
  @Transactional(readOnly = true)
  public AudioDownload downloadAudio(UUID userId, UUID jobId) {
    GenerationJob job =
        generationJobRepository
            .findByIdAndUserId(jobId, userId)
            .orElseThrow(() -> ApiException.notFound("Job not found"));
    if (job.getAudioS3Key() == null) {
      throw ApiException.notFound("Audio not available yet");
    }
    byte[] bytes = s3StorageService.downloadBytes(job.getAudioS3Key());
    String extension = extensionFor(job.getOutputFormat());
    String filename = job.getVoiceId() + "-" + job.getId() + "." + extension;
    return new AudioDownload(bytes, filename, contentTypeFor(extension));
  }

  public record AudioDownload(byte[] bytes, String filename, String contentType) {}

  private static String extensionFor(String outputFormat) {
    return switch (outputFormat) {
      case "wav" -> "wav";
      case "ogg" -> "ogg";
      default -> "mp3"; // mp3-128, mp3-192
    };
  }

  private static String contentTypeFor(String extension) {
    return switch (extension) {
      case "wav" -> "audio/wav";
      case "ogg" -> "audio/ogg";
      default -> "audio/mpeg";
    };
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

  private JobResponse toJobResponse(GenerationJob job) {
    return toJobResponse(job, generationJobChunkRepository.findByJobIdOrderByChunkIndexAsc(job.getId()));
  }

  private JobResponse toJobResponse(GenerationJob job, List<GenerationJobChunk> chunks) {
    String downloadUrl =
        job.getAudioS3Key() != null
            ? s3StorageService.presignDownloadUrl(job.getAudioS3Key()).toString()
            : null;
    List<ChunkResponse> chunkResponses = chunks.stream().map(this::toChunkResponse).toList();
    return JobResponse.from(job, downloadUrl, chunkResponses);
  }

  private ChunkResponse toChunkResponse(GenerationJobChunk chunk) {
    String url = s3StorageService.presignDownloadUrl(chunk.getAudioS3Key()).toString();
    return new ChunkResponse(chunk.getChunkIndex(), chunk.getTotalChunks(), url, chunk.getDurationSeconds());
  }
}
