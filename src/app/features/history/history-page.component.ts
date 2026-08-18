import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../core/services/generation-history.service';
import { TranslateService } from '../../core/services/translate.service';
import { HistoryDetailModalService } from '../../core/services/history-detail-modal.service';
import { SeoService } from '../../core/services/seo.service';
import { formatRelativeTime } from '../../core/utils/relative-time';
import { isGenerating } from '../../core/utils/generation-progress';

const SNIPPET_LENGTH = 220;

@Component({
  selector: 'app-history-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './history-page.component.html',
  styleUrl: './history-page.component.scss',
})
export class HistoryPageComponent {
  readonly clearConfirmOpen = signal(false);

  constructor(
    readonly history: GenerationHistoryService,
    readonly translate: TranslateService,
    readonly historyModal: HistoryDetailModalService,
    private readonly router: Router,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.historyTitle));
  }

  snippet(text: string): string {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }

  openDetail(entry: GenerationEntry): void {
    this.historyModal.open(entry.id);
  }

  replay(entry: GenerationEntry): void {
    // No navigation needed — the player is a persistent bar visible on
    // every /app/* page, so playback starts right where you are.
    this.history.replay(entry);
  }

  reuse(entry: GenerationEntry): void {
    this.history.reuse(entry);
    this.router.navigateByUrl('/app');
  }

  remove(id: string): void {
    this.history.remove(id);
  }

  startClear(): void {
    this.clearConfirmOpen.set(true);
  }

  cancelClear(): void {
    this.clearConfirmOpen.set(false);
  }

  confirmClear(): void {
    this.history.clear();
    this.clearConfirmOpen.set(false);
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso, this.translate.dict().historyPage);
  }

  setFeedback(entry: GenerationEntry, feedback: 'up' | 'down'): void {
    this.history.setFeedback(entry.id, entry.feedback === feedback ? null : feedback);
  }

  isGenerating(entry: GenerationEntry): boolean {
    return isGenerating(entry.status);
  }

  progressPercent(entry: GenerationEntry): number | null {
    return this.history.smoothedProgressPercent(entry);
  }
}
