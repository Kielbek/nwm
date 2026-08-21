import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AccountService, PlanId } from '../../core/services/account.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

/** Plans at this rank or above unlock API key access — mirrors the profileFaq copy about API keys. */
const API_KEYS_MIN_PLAN: PlanId = 'creator';

@Component({
  selector: 'app-api-keys-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './api-keys-page.component.html',
  styleUrl: './api-keys-page.component.scss',
})
export class ApiKeysPageComponent {
  readonly hasApiAccess = computed(
    () => this.account.planRank(this.account.planId()) >= this.account.planRank(API_KEYS_MIN_PLAN)
  );
  readonly maskedApiKey = 'sk-live-••••••••••••••••';
  readonly copied = signal(false);
  private copiedTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly account: AccountService,
    readonly translate: TranslateService,
    private readonly router: Router,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().profilePage.apiKeysTitle));
  }

  copyKey(): void {
    navigator.clipboard?.writeText(this.maskedApiKey).then(() => {
      this.copied.set(true);
      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }
      this.copiedTimeout = setTimeout(() => this.copied.set(false), 2000);
    });
  }

  upgrade(): void {
    this.router.navigate(['/app/checkout'], {
      queryParams: { type: 'plan', id: API_KEYS_MIN_PLAN, cycle: this.account.billingCycle() },
    });
  }
}
