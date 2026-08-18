import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../core/services/generation-history.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';
import { formatRelativeTime } from '../../core/utils/relative-time';

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
    private readonly router: Router,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.historyTitle));
  }

  snippet(text: string): string {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }

  replay(entry: GenerationEntry): void {
    this.history.replay(entry);
    this.router.navigateByUrl('/app');
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
}
