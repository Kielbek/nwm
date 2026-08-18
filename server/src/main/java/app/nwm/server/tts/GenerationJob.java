package app.nwm.server.tts;

import app.nwm.server.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "generation_jobs")
public class GenerationJob {

  @Id
  @GeneratedValue
  @UuidGenerator
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private JobStatus status = JobStatus.PENDING;

  // No @Lob: Postgres `text` has no practical size limit on its own, and
  // @Lob makes Hibernate expect an `oid` large-object column instead of the
  // plain `text` column Flyway creates — validation fails against the real
  // database (H2's create-drop test schema doesn't catch this mismatch).
  @Column(nullable = false)
  private String text;

  @Column(name = "voice_id", nullable = false)
  private String voiceId;

  @Column(name = "model_id", nullable = false)
  private String modelId;

  @Column(name = "output_format", nullable = false)
  private String outputFormat;

  /** JSON-encoded snapshot of the synthesis settings (speed, stability, ...). */
  @Column(name = "settings_json", nullable = false)
  private String settingsJson;

  @Column(name = "character_count", nullable = false)
  private int characterCount;

  @Column(name = "audio_s3_key")
  private String audioS3Key;

  @Column(name = "duration_seconds")
  private BigDecimal durationSeconds;

  @Column(name = "error_message")
  private String errorMessage;

  // Plain UUID rather than a @ManyToOne to app.nwm.server.folder.GenerationFolder
  // — nothing here needs to navigate to the folder entity itself, only
  // filter/display by its id, so a full JPA relationship (and the fetch
  // joins/proxies that come with it) would be unused overhead.
  @Column(name = "folder_id")
  private UUID folderId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected GenerationJob() {}

  public GenerationJob(
      User user,
      String text,
      String voiceId,
      String modelId,
      String outputFormat,
      String settingsJson,
      int characterCount) {
    this.user = user;
    this.text = text;
    this.voiceId = voiceId;
    this.modelId = modelId;
    this.outputFormat = outputFormat;
    this.settingsJson = settingsJson;
    this.characterCount = characterCount;
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public void markProcessing() {
    this.status = JobStatus.PROCESSING;
  }

  public void markCompleted(String audioS3Key, BigDecimal durationSeconds) {
    this.status = JobStatus.COMPLETED;
    this.audioS3Key = audioS3Key;
    this.durationSeconds = durationSeconds;
  }

  public void markFailed(String errorMessage) {
    this.status = JobStatus.FAILED;
    this.errorMessage = errorMessage;
  }

  /** `null` unfiles it (moves it back to the top-level "All" view). */
  public void moveToFolder(UUID folderId) {
    this.folderId = folderId;
  }

  public UUID getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public JobStatus getStatus() {
    return status;
  }

  public String getText() {
    return text;
  }

  public String getVoiceId() {
    return voiceId;
  }

  public String getModelId() {
    return modelId;
  }

  public String getOutputFormat() {
    return outputFormat;
  }

  public String getSettingsJson() {
    return settingsJson;
  }

  public int getCharacterCount() {
    return characterCount;
  }

  public String getAudioS3Key() {
    return audioS3Key;
  }

  public BigDecimal getDurationSeconds() {
    return durationSeconds;
  }

  public String getErrorMessage() {
    return errorMessage;
  }

  public UUID getFolderId() {
    return folderId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
