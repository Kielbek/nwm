import { ChangeDetectionStrategy, Component, HostListener, computed, effect, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { FileManagerModalService } from '../../../core/services/file-manager-modal.service';
import { FolderService } from '../../../core/services/folder.service';
import { Folder } from '../../../core/models/folder.model';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../../core/services/generation-history.service';
import { HistoryDetailModalService } from '../../../core/services/history-detail-modal.service';
import { TranslateService } from '../../../core/services/translate.service';
import { formatRelativeTime } from '../../../core/utils/relative-time';
import { isGenerating } from '../../../core/utils/generation-progress';

const SNIPPET_LENGTH = 140;

/**
 * Windows-Explorer-style popup for organizing generated audio into
 * single-level folders — replaces the old /app/history page as the
 * header's entry point. Root view lists every job (filed and unfiled
 * together, like a real file explorer's root); opening a folder tile
 * switches to that folder's own paginated list (fetched separately via
 * GenerationHistoryService.loadFolderEntries so browsing in doesn't
 * require the whole global history to already be loaded). Moving a
 * recording is native HTML5 drag-and-drop onto a folder tile, or onto the
 * breadcrumb to unfile it.
 */
@Component({
  selector: 'app-file-manager-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ModalShellComponent],
  templateUrl: './file-manager-modal.component.html',
  styleUrl: './file-manager-modal.component.scss',
})
export class FileManagerModalComponent {
  readonly currentFolderId = signal<string | null>(null);
  readonly folderEntries = signal<GenerationEntry[]>([]);
  readonly folderHasMore = signal(false);
  readonly folderLoading = signal(false);
  private folderPage = 0;

  readonly dragEntryId = signal<string | null>(null);
  readonly dragOverFolderId = signal<string | null>(null);
  readonly dragOverRoot = signal(false);

  readonly creatingFolder = signal(false);
  readonly newFolderName = signal('');
  readonly renamingFolderId = signal<string | null>(null);
  readonly renameValue = signal('');
  readonly deleteConfirmFolderId = signal<string | null>(null);

  readonly currentFolder = computed(
    () => this.folders.folders().find((f) => f.id === this.currentFolderId()) ?? null
  );
  readonly currentEntries = computed(() =>
    this.currentFolderId() ? this.folderEntries() : this.history.entries()
  );
  readonly currentHasMore = computed(() =>
    this.currentFolderId() ? this.folderHasMore() : this.history.hasMore()
  );
  readonly currentLoading = computed(() =>
    this.currentFolderId() ? this.folderLoading() : this.history.loadingMore()
  );

  constructor(
    readonly modal: FileManagerModalService,
    readonly folders: FolderService,
    readonly history: GenerationHistoryService,
    readonly translate: TranslateService,
    private readonly historyModal: HistoryDetailModalService
  ) {
    effect(() => {
      if (this.modal.isOpen()) {
        this.folders.ensureLoaded();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.modal.isOpen()) {
      return;
    }
    if (this.deleteConfirmFolderId()) {
      this.deleteConfirmFolderId.set(null);
      return;
    }
    if (this.renamingFolderId()) {
      this.renamingFolderId.set(null);
      return;
    }
    if (this.creatingFolder()) {
      this.creatingFolder.set(false);
      return;
    }
    this.close();
  }

  close(): void {
    this.modal.close();
    this.currentFolderId.set(null);
    this.creatingFolder.set(false);
    this.renamingFolderId.set(null);
    this.deleteConfirmFolderId.set(null);
  }

  openFolder(folder: Folder): void {
    this.currentFolderId.set(folder.id);
    this.folderEntries.set([]);
    this.folderHasMore.set(false);
    this.folderPage = 0;
    this.loadFolderPage();
  }

  backToRoot(): void {
    this.currentFolderId.set(null);
  }

  loadMoreEntries(): void {
    if (this.currentFolderId()) {
      this.loadFolderPage();
    } else {
      this.history.loadMore();
    }
  }

  private loadFolderPage(): void {
    const folderId = this.currentFolderId();
    if (!folderId || this.folderLoading()) {
      return;
    }
    this.folderLoading.set(true);
    this.history.loadFolderEntries(folderId, this.folderPage).subscribe({
      next: (result) => {
        this.folderEntries.update((list) => [...list, ...result.entries]);
        this.folderHasMore.set(result.hasMore);
        this.folderPage += 1;
        this.folderLoading.set(false);
      },
      error: () => this.folderLoading.set(false),
    });
  }

  // --- Folder CRUD --------------------------------------------------

  startCreateFolder(): void {
    this.creatingFolder.set(true);
    this.newFolderName.set('');
  }

  cancelCreateFolder(): void {
    this.creatingFolder.set(false);
  }

  confirmCreateFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) {
      return;
    }
    this.folders.create(name).subscribe(() => {
      this.creatingFolder.set(false);
      this.newFolderName.set('');
    });
  }

  startRenameFolder(folder: Folder, event: Event): void {
    event.stopPropagation();
    this.renamingFolderId.set(folder.id);
    this.renameValue.set(folder.name);
  }

  cancelRenameFolder(event?: Event): void {
    event?.stopPropagation();
    this.renamingFolderId.set(null);
  }

  confirmRenameFolder(folder: Folder, event?: Event): void {
    event?.stopPropagation();
    const name = this.renameValue().trim();
    if (!name || name === folder.name) {
      this.renamingFolderId.set(null);
      return;
    }
    this.folders.rename(folder.id, name).subscribe(() => this.renamingFolderId.set(null));
  }

  startDeleteFolder(folder: Folder, event: Event): void {
    event.stopPropagation();
    this.deleteConfirmFolderId.set(folder.id);
  }

  cancelDeleteFolder(event?: Event): void {
    event?.stopPropagation();
    this.deleteConfirmFolderId.set(null);
  }

  confirmDeleteFolder(folder: Folder, event?: Event): void {
    event?.stopPropagation();
    this.folders.remove(folder.id).subscribe(() => {
      this.deleteConfirmFolderId.set(null);
      if (this.currentFolderId() === folder.id) {
        this.backToRoot();
      }
    });
  }

  // --- Entries --------------------------------------------------------

  openDetail(entry: GenerationEntry): void {
    this.close();
    this.historyModal.open(entry.id);
  }

  togglePlayback(entry: GenerationEntry, event: Event): void {
    event.stopPropagation();
    this.history.togglePlayback(entry);
  }

  isEntryPlaying(entry: GenerationEntry): boolean {
    return this.history.activeEntryId() === entry.id && this.history.isPlaying();
  }

  isGenerating(entry: GenerationEntry): boolean {
    return isGenerating(entry.status);
  }

  progressPercent(entry: GenerationEntry): number | null {
    return this.history.smoothedProgressPercent(entry);
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso, this.translate.dict().historyPage);
  }

  snippet(text: string): string {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }

  itemCountLabel(count: number): string {
    return this.translate.dict().fileManager.itemCount.replace('{n}', String(count));
  }

  // --- Drag and drop ----------------------------------------------------

  onDragStart(entry: GenerationEntry, event: DragEvent): void {
    this.dragEntryId.set(entry.id);
    event.dataTransfer?.setData('text/plain', entry.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd(): void {
    this.dragEntryId.set(null);
    this.dragOverFolderId.set(null);
    this.dragOverRoot.set(false);
  }

  onFolderDragOver(folder: Folder, event: DragEvent): void {
    if (!this.dragEntryId()) {
      return;
    }
    event.preventDefault();
    this.dragOverFolderId.set(folder.id);
  }

  onFolderDragLeave(folder: Folder): void {
    if (this.dragOverFolderId() === folder.id) {
      this.dragOverFolderId.set(null);
    }
  }

  onFolderDrop(folder: Folder, event: DragEvent): void {
    event.preventDefault();
    this.dragOverFolderId.set(null);
    const entryId = this.dragEntryId() ?? event.dataTransfer?.getData('text/plain') ?? null;
    if (entryId) {
      this.moveEntry(entryId, folder.id);
    }
  }

  onRootDragOver(event: DragEvent): void {
    if (!this.dragEntryId()) {
      return;
    }
    event.preventDefault();
    this.dragOverRoot.set(true);
  }

  onRootDragLeave(): void {
    this.dragOverRoot.set(false);
  }

  onRootDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOverRoot.set(false);
    const entryId = this.dragEntryId() ?? event.dataTransfer?.getData('text/plain') ?? null;
    if (entryId) {
      this.moveEntry(entryId, null);
    }
  }

  private moveEntry(entryId: string, folderId: string | null): void {
    const entry =
      this.history.entries().find((e) => e.id === entryId) ??
      this.folderEntries().find((e) => e.id === entryId);
    if (!entry || entry.folderId === folderId) {
      return;
    }
    const previousFolderId = entry.folderId;
    this.history.moveToFolder(entry, folderId).subscribe(() => {
      if (previousFolderId) {
        this.folders.adjustCount(previousFolderId, -1);
      }
      if (folderId) {
        this.folders.adjustCount(folderId, 1);
      }
      if (
        this.currentFolderId() &&
        previousFolderId === this.currentFolderId() &&
        folderId !== this.currentFolderId()
      ) {
        this.folderEntries.update((list) => list.filter((e) => e.id !== entryId));
      }
    });
  }
}
