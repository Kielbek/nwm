package app.nwm.server.auth;

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
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

/** Single-use, hashed tokens for password reset and email verification — same storage pattern as {@link RefreshToken}. */
@Entity
@Table(name = "verification_tokens")
public class VerificationToken {

  @Id
  @GeneratedValue
  @UuidGenerator
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "token_hash", nullable = false, unique = true)
  private String tokenHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private VerificationTokenType type;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "consumed_at")
  private Instant consumedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected VerificationToken() {}

  public VerificationToken(User user, String tokenHash, VerificationTokenType type, Instant expiresAt) {
    this.user = user;
    this.tokenHash = tokenHash;
    this.type = type;
    this.expiresAt = expiresAt;
  }

  @PrePersist
  void onCreate() {
    createdAt = Instant.now();
  }

  public boolean isValid() {
    return consumedAt == null && expiresAt.isAfter(Instant.now());
  }

  public void consume() {
    this.consumedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public VerificationTokenType getType() {
    return type;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public Instant getConsumedAt() {
    return consumedAt;
  }
}
