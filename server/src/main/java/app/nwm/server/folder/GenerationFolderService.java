package app.nwm.server.folder;

import app.nwm.server.common.ApiException;
import app.nwm.server.folder.dto.FolderResponse;
import app.nwm.server.tts.GenerationJob;
import app.nwm.server.tts.GenerationJobRepository;
import app.nwm.server.user.User;
import app.nwm.server.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GenerationFolderService {

  private final GenerationFolderRepository generationFolderRepository;
  private final GenerationJobRepository generationJobRepository;
  private final UserRepository userRepository;

  public GenerationFolderService(
      GenerationFolderRepository generationFolderRepository,
      GenerationJobRepository generationJobRepository,
      UserRepository userRepository) {
    this.generationFolderRepository = generationFolderRepository;
    this.generationJobRepository = generationJobRepository;
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public List<FolderResponse> list(UUID userId) {
    return generationFolderRepository.findByUserIdOrderByNameAsc(userId).stream()
        .map(folder -> FolderResponse.from(folder, generationJobRepository.countByFolderId(folder.getId())))
        .toList();
  }

  @Transactional
  public FolderResponse create(UUID userId, String name) {
    User user =
        userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
    GenerationFolder folder = generationFolderRepository.save(new GenerationFolder(user, name.trim()));
    return FolderResponse.from(folder, 0);
  }

  @Transactional
  public FolderResponse rename(UUID userId, UUID folderId, String name) {
    GenerationFolder folder = findOwned(userId, folderId);
    folder.rename(name.trim());
    generationFolderRepository.save(folder);
    return FolderResponse.from(folder, generationJobRepository.countByFolderId(folder.getId()));
  }

  /**
   * Jobs inside the folder aren't deleted — they're unfiled (folder_id ->
   * null) first. The FK also carries an ON DELETE SET NULL as a DB-level
   * safety net for any future code path that deletes a folder row directly,
   * but that isn't something this method can rely on: Flyway is disabled in
   * the test profile (Hibernate generates the schema from entities instead,
   * and folderId is a plain column rather than a mapped relationship there),
   * so unfiling has to happen explicitly here to actually be guaranteed.
   */
  @Transactional
  public void delete(UUID userId, UUID folderId) {
    GenerationFolder folder = findOwned(userId, folderId);
    for (GenerationJob job : generationJobRepository.findAllByFolderId(folderId)) {
      job.moveToFolder(null);
      generationJobRepository.save(job);
    }
    generationFolderRepository.delete(folder);
  }

  /** Throws if `folderId` is non-null and isn't a folder owned by `userId` — used before filing a job into it. */
  @Transactional(readOnly = true)
  public void assertOwnedIfPresent(UUID userId, UUID folderId) {
    if (folderId != null && !generationFolderRepository.existsByIdAndUserId(folderId, userId)) {
      throw ApiException.notFound("Folder not found");
    }
  }

  private GenerationFolder findOwned(UUID userId, UUID folderId) {
    return generationFolderRepository
        .findByIdAndUserId(folderId, userId)
        .orElseThrow(() -> ApiException.notFound("Folder not found"));
  }
}
