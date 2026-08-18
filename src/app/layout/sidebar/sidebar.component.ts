import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslateService } from '../../core/services/translate.service';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../core/services/generation-history.service';
import { HistoryDetailModalService } from '../../core/services/history-detail-modal.service';
import { formatRelativeTime } from '../../core/utils/relative-time';
import { isGenerating } from '../../core/utils/generation-progress';

const SNIPPET_LENGTH = 34;
// Trigger loadMore() this many pixels before the sidebar's own scroll
// (the whole <aside> scrolls, not a nested container — see the scss) hits bottom.
const LOAD_MORE_THRESHOLD_PX = 120;

interface HistoryGroup {
  label: string;
  entries: GenerationEntry[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() open = true;
  @Input() overlay = false;
  @Input() framed = false;
  @Output() closeRequested = new EventEmitter<void>();

  readonly historyGroups = computed<HistoryGroup[]>(() => {
    const dict = this.translate.dict();
    const locale = this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US';
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const groups: HistoryGroup[] = [];
    for (const entry of this.history.entries()) {
      const date = new Date(entry.createdAt);
      const label = this.isSameDay(date, now)
        ? dict.sidebar.historyToday
        : this.isSameDay(date, yesterday)
          ? dict.sidebar.historyYesterday
          : date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });

      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === label) {
        lastGroup.entries.push(entry);
      } else {
        groups.push({ label, entries: [entry] });
      }
    }
    return groups;
  });

  constructor(
    readonly translate: TranslateService,
    readonly history: GenerationHistoryService,
    readonly historyModal: HistoryDetailModalService,
    private readonly router: Router
  ) {}

  snippet(text: string): string {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso, this.translate.dict().historyPage);
  }

  togglePlayback(entry: GenerationEntry): void {
    // No navigation needed — the player is a persistent bar visible on
    // every /app/* page, so playback starts right where you are.
    this.history.togglePlayback(entry);
  }

  isEntryPlaying(entry: GenerationEntry): boolean {
    return this.history.activeEntryId() === entry.id && this.history.isPlaying();
  }

  reuse(entry: GenerationEntry): void {
    this.history.reuse(entry);
    this.router.navigateByUrl('/app');
  }

  remove(id: string): void {
    this.history.remove(id);
  }

  isGenerating(entry: GenerationEntry): boolean {
    return isGenerating(entry.status);
  }

  progressPercent(entry: GenerationEntry): number | null {
    return this.history.smoothedProgressPercent(entry);
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < LOAD_MORE_THRESHOLD_PX) {
      this.history.loadMore();
    }
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
