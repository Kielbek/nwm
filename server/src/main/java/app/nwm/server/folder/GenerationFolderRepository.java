package app.nwm.server.folder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenerationFolderRepository extends JpaRepository<GenerationFolder, UUID> {
  List<GenerationFolder> findByUserIdOrderByNameAsc(UUID userId);

  Optional<GenerationFolder> findByIdAndUserId(UUID id, UUID userId);

  boolean existsByIdAndUserId(UUID id, UUID userId);
}
