package app.nwm.server.folder;

import app.nwm.server.folder.dto.CreateFolderRequest;
import app.nwm.server.folder.dto.FolderResponse;
import app.nwm.server.security.SecurityUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/folders")
@PreAuthorize("isAuthenticated()")
public class FolderController {

  private final GenerationFolderService folderService;

  public FolderController(GenerationFolderService folderService) {
    this.folderService = folderService;
  }

  @GetMapping
  public List<FolderResponse> list(@AuthenticationPrincipal SecurityUser principal) {
    return folderService.list(principal.getId());
  }

  @PostMapping
  public ResponseEntity<FolderResponse> create(
      @AuthenticationPrincipal SecurityUser principal, @Valid @RequestBody CreateFolderRequest request) {
    FolderResponse folder = folderService.create(principal.getId(), request.name());
    return ResponseEntity.status(HttpStatus.CREATED).body(folder);
  }

  @PatchMapping("/{id}")
  public FolderResponse rename(
      @AuthenticationPrincipal SecurityUser principal,
      @PathVariable UUID id,
      @Valid @RequestBody CreateFolderRequest request) {
    return folderService.rename(principal.getId(), id, request.name());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal SecurityUser principal, @PathVariable UUID id) {
    folderService.delete(principal.getId(), id);
    return ResponseEntity.noContent().build();
  }
}
