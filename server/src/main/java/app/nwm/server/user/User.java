package app.nwm.server.user;

import app.nwm.server.plan.BillingCycle;
import app.nwm.server.plan.PlanId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue
  @UuidGenerator
  private UUID id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String name;

  @Column(name = "password_hash")
  private String passwordHash;

  @Column(name = "avatar_url")
  private String avatarUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AuthProvider provider = AuthProvider.LOCAL;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role role = Role.USER;

  @Column(name = "email_verified", nullable = false)
  private boolean emailVerified = false;

  @Enumerated(EnumType.STRING)
  @Column(name = "plan_id", nullable = false)
  private PlanId planId = PlanId.FREE;

  @Enumerated(EnumType.STRING)
  @Column(name = "billing_cycle", nullable = false)
  private BillingCycle billingCycle = BillingCycle.MONTHLY;

  @Column(name = "characters_used", nullable = false)
  private long charactersUsed = 0;

  @Column(name = "bonus_characters", nullable = false)
  private long bonusCharacters = 0;

  @Column(name = "plan_renews_at")
  private LocalDate planRenewsAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected User() {}

  public User(String email, String name, AuthProvider provider) {
    this.email = email;
    this.name = name;
    this.provider = provider;
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

  public UUID getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public String getAvatarUrl() {
    return avatarUrl;
  }

  public void setAvatarUrl(String avatarUrl) {
    this.avatarUrl = avatarUrl;
  }

  public AuthProvider getProvider() {
    return provider;
  }

  public void setProvider(AuthProvider provider) {
    this.provider = provider;
  }

  public Role getRole() {
    return role;
  }

  public void setRole(Role role) {
    this.role = role;
  }

  public boolean isEmailVerified() {
    return emailVerified;
  }

  public void setEmailVerified(boolean emailVerified) {
    this.emailVerified = emailVerified;
  }

  public PlanId getPlanId() {
    return planId;
  }

  public void setPlanId(PlanId planId) {
    this.planId = planId;
  }

  public BillingCycle getBillingCycle() {
    return billingCycle;
  }

  public void setBillingCycle(BillingCycle billingCycle) {
    this.billingCycle = billingCycle;
  }

  public long getCharactersUsed() {
    return charactersUsed;
  }

  public void setCharactersUsed(long charactersUsed) {
    this.charactersUsed = charactersUsed;
  }

  public long getBonusCharacters() {
    return bonusCharacters;
  }

  public void setBonusCharacters(long bonusCharacters) {
    this.bonusCharacters = bonusCharacters;
  }

  public LocalDate getPlanRenewsAt() {
    return planRenewsAt;
  }

  public void setPlanRenewsAt(LocalDate planRenewsAt) {
    this.planRenewsAt = planRenewsAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
