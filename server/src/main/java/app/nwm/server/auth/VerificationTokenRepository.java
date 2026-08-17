package app.nwm.server.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, UUID> {
  Optional<VerificationToken> findByTokenHashAndType(String tokenHash, VerificationTokenType type);

  @Modifying
  @Query(
      "update VerificationToken t set t.consumedAt = :now "
          + "where t.user.id = :userId and t.type = :type and t.consumedAt is null")
  void invalidateOutstanding(
      @Param("userId") UUID userId, @Param("type") VerificationTokenType type, @Param("now") Instant now);

  @Modifying
  @Query("delete from VerificationToken t where t.expiresAt < :cutoff or t.consumedAt is not null")
  int deleteExpiredOrConsumed(@Param("cutoff") Instant cutoff);
}
