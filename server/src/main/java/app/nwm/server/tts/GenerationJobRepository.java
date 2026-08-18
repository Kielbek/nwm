package app.nwm.server.tts;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenerationJobRepository extends JpaRepository<GenerationJob, UUID> {
  Optional<GenerationJob> findByIdAndUserId(UUID id, UUID userId);

  Page<GenerationJob> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

  Page<GenerationJob> findByUserIdAndFolderIdOrderByCreatedAtDesc(
      UUID userId, UUID folderId, Pageable pageable);

  List<GenerationJob> findAllByFolderId(UUID folderId);

  long countByFolderId(UUID folderId);

  Page<GenerationJob> findAllByOrderByCreatedAtDesc(Pageable pageable);

  Page<GenerationJob> findByStatusOrderByCreatedAtDesc(app.nwm.server.tts.JobStatus status, Pageable pageable);
}
