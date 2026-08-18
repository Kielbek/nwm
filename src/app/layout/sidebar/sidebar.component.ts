import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslateService } from '../../core/services/translate.service';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../core/services/generation-history.service';
import { formatRelativeTime } from '../../core/utils/relative-time';

const RECENT_ENTRIES_LIMIT = 6;
const SNIPPET_LENGTH = 34;

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

  readonly recentEntries = computed(() => this.history.entries().slice(0, RECENT_ENTRIES_LIMIT));

  readonly historyGroups = computed<HistoryGroup[]>(() => {
    const dict = this.translate.dict();
    const locale = this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US';
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const groups: HistoryGroup[] = [];
    for (const entry of this.recentEntries()) {
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
    private readonly router: Router
  ) {}

  snippet(text: string): string {
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso, this.translate.dict().historyPage);
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

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
