package app.nwm.server.folder.dto;

import app.nwm.server.folder.GenerationFolder;
import java.time.Instant;
import java.util.UUID;

public record FolderResponse(UUID id, String name, long jobCount, Instant createdAt) {

  public static FolderResponse from(GenerationFolder folder, long jobCount) {
    return new FolderResponse(folder.getId(), folder.getName(), jobCount, folder.getCreatedAt());
  }
}
