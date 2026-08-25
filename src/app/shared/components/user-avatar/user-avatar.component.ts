import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { AccountService } from '../../../core/services/account.service';
import { TranslateService } from '../../../core/services/translate.service';

const STROKE_WIDTH_RATIO = 0.07;
const RING_GAP = 2;
const WARNING_THRESHOLD = 85;

/**
 * The signed-in account's own avatar — initials on a gradient circle,
 * wrapped in a thin progress ring showing how much of the monthly
 * character quota is used (hover for the exact numbers). Used everywhere
 * the account's own avatar appears (header dropdown trigger, profile
 * identity card) so that indicator only needs to be built once. Uses the
 * generic app-wide token names (--border/--accent), so it inherits
 * whichever page's local palette it's dropped into, light or dark.
 */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-avatar.component.html',
  styleUrl: './user-avatar.component.scss',
})
export class UserAvatarComponent {
  @Input() size = 32;

  readonly usagePercent = computed(() => Math.min(100, this.account.usagePercent()));
  readonly isWarning = computed(() => this.usagePercent() > WARNING_THRESHOLD);

  readonly tooltip = computed(() => {
    const dict = this.translate.dict().userAvatar;
    return dict.usageTooltip
      .replace('{percent}', String(Math.round(this.usagePercent())))
      .replace('{used}', this.formatNumber(this.account.charactersUsed()))
      .replace('{limit}', this.formatNumber(this.account.characterLimit()));
  });

  constructor(readonly account: AccountService, private readonly translate: TranslateService) {}

  get strokeWidth(): number {
    return Math.max(2, Math.round(this.size * STROKE_WIDTH_RATIO));
  }

  get radius(): number {
    return this.size / 2 - this.strokeWidth / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get innerSize(): number {
    return Math.max(0, this.size - (this.strokeWidth + RING_GAP) * 2);
  }

  get fontSize(): number {
    return Math.max(9, Math.round(this.innerSize * 0.34));
  }

  readonly ringOffset = computed(() => this.circumference * (1 - this.usagePercent() / 100));

  private formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }
}
