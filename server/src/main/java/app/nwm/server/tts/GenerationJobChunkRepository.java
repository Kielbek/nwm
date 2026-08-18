package app.nwm.server.tts;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenerationJobChunkRepository extends JpaRepository<GenerationJobChunk, UUID> {
  List<GenerationJobChunk> findByJobIdOrderByChunkIndexAsc(UUID jobId);

  boolean existsByJobIdAndChunkIndex(UUID jobId, int chunkIndex);
}
