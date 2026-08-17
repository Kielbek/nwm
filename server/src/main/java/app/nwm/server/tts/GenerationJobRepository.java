package app.nwm.server.tts;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenerationJobRepository extends JpaRepository<GenerationJob, UUID> {
  Optional<GenerationJob> findByIdAndUserId(UUID id, UUID userId);

  Page<GenerationJob> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

  Page<GenerationJob> findAllByOrderByCreatedAtDesc(Pageable pageable);

  Page<GenerationJob> findByStatusOrderByCreatedAtDesc(app.nwm.server.tts.JobStatus status, Pageable pageable);
}
