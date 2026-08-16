import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../core/services/generation-history.service';
import { TtsService } from '../../core/services/tts.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

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
    readonly ttsService: TtsService,
    readonly translate: TranslateService,
    private readonly router: Router,
    seo: SeoService
  ) {
    seo.setPrivateTitle('Historia generowania');
  }

  snippet(text: string): string {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }

  replay(entry: GenerationEntry): void {
    this.ttsService.synthesize({ text: entry.text, settings: entry.settings }).subscribe();
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
    const dict = this.translate.dict().historyPage;
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) {
      return dict.justNow;
    }
    if (minutes < 60) {
      return dict.minutesAgo.replace('{n}', String(minutes));
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return dict.hoursAgo.replace('{n}', String(hours));
    }
    const days = Math.floor(hours / 24);
    return dict.daysAgo.replace('{n}', String(days));
  }
}
