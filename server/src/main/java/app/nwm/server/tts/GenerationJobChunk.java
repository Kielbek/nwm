package app.nwm.server.tts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/**
 * One synthesized text segment of a job, persisted as soon as the worker
 * finishes it — this is what lets the SSE stream endpoint replay chunks a
 * client missed (e.g. reconnecting) and lets history/replay play back
 * saved audio instead of re-synthesizing.
 */
@Entity
@Table(
    name = "generation_job_chunks",
    uniqueConstraints = @UniqueConstraint(columnNames = {"job_id", "chunk_index"}))
public class GenerationJobChunk {

  @Id
  @GeneratedValue
  @UuidGenerator
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "job_id", nullable = false)
  private GenerationJob job;

  @Column(name = "chunk_index", nullable = false)
  private int chunkIndex;

  @Column(name = "total_chunks", nullable = false)
  private int totalChunks;

  @Column(name = "audio_s3_key", nullable = false)
  private String audioS3Key;

  @Column(name = "duration_seconds")
  private BigDecimal durationSeconds;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected GenerationJobChunk() {}

  public GenerationJobChunk(
      GenerationJob job, int chunkIndex, int totalChunks, String audioS3Key, BigDecimal durationSeconds) {
    this.job = job;
    this.chunkIndex = chunkIndex;
    this.totalChunks = totalChunks;
    this.audioS3Key = audioS3Key;
    this.durationSeconds = durationSeconds;
  }

  @PrePersist
  void onCreate() {
    createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public GenerationJob getJob() {
    return job;
  }

  public int getChunkIndex() {
    return chunkIndex;
  }

  public int getTotalChunks() {
    return totalChunks;
  }

  public String getAudioS3Key() {
    return audioS3Key;
  }

  public BigDecimal getDurationSeconds() {
    return durationSeconds;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
