import { ChangeDetectionStrategy, Component, HostListener, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { HistoryDetailModalService } from '../../../core/services/history-detail-modal.service';
import { GenerationHistoryService } from '../../../core/services/generation-history.service';
import { TranslateService } from '../../../core/services/translate.service';
import { formatRelativeTime } from '../../../core/utils/relative-time';
import { downloadEntry } from '../../../core/utils/download-entry';

/**
 * Full-detail view of one history entry, opened by clicking a row in the
 * sidebar or history page (not its small per-row action buttons, which
 * still work standalone for quick actions). Looks the entry up live by id
 * on every render, so it reflects a still-streaming generation's progress
 * instead of freezing at whatever state it was in when opened.
 */
@Component({
  selector: 'app-history-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './history-detail-modal.component.html',
  styleUrl: './history-detail-modal.component.scss',
})
export class HistoryDetailModalComponent {
  readonly deleteConfirmOpen = signal(false);

  readonly entry = computed(
    () => this.history.entries().find((e) => e.id === this.modal.entryId()) ?? null
  );

  constructor(
    readonly modal: HistoryDetailModalService,
    readonly history: GenerationHistoryService,
    readonly translate: TranslateService,
    private readonly router: Router
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.entryId()) {
      this.close();
    }
  }

  close(): void {
    this.deleteConfirmOpen.set(false);
    this.modal.close();
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso, this.translate.dict().historyPage);
  }

  play(): void {
    const entry = this.entry();
    if (!entry) {
      return;
    }
    this.history.replay(entry);
    this.close();
  }

  reuse(): void {
    const entry = this.entry();
    if (!entry) {
      return;
    }
    this.history.reuse(entry);
    this.router.navigateByUrl('/app');
    this.close();
  }

  download(): void {
    const entry = this.entry();
    if (entry) {
      downloadEntry(entry);
    }
  }

  setFeedback(feedback: 'up' | 'down'): void {
    const entry = this.entry();
    if (entry) {
      this.history.setFeedback(entry.id, entry.feedback === feedback ? null : feedback);
    }
  }

  startDelete(): void {
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
  }

  confirmDelete(): void {
    const entry = this.entry();
    if (entry) {
      this.history.remove(entry.id);
    }
    this.close();
  }
}
