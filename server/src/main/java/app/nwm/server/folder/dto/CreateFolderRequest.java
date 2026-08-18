package app.nwm.server.folder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFolderRequest(@NotBlank @Size(max = 120) String name) {}
