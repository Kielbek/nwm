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
  @Output() closeRequested = new EventEmitter<void>();

  readonly recentEntries = computed(() => this.history.entries().slice(0, RECENT_ENTRIES_LIMIT));

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

  reuse(entry: GenerationEntry): void {
    this.history.reuse(entry);
    this.router.navigateByUrl('/app');
  }
}
