import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AccountService, BillingCycle } from '../../core/services/account.service';
import { BillingService } from '../../core/services/billing.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';
import { BackendBillingCycle, BackendPlanId } from '../../core/models/auth.models';

type CheckoutType = 'plan' | 'topup';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
})
export class CheckoutPageComponent {
  readonly type = signal<CheckoutType>('plan');
  readonly itemId = signal('');
  readonly cycle = signal<BillingCycle>('monthly');

  readonly isRedirecting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly plan = computed(() => this.account.plans().find((p) => p.id === this.itemId()));
  readonly topUp = computed(() => this.account.topUps().find((t) => t.id === this.itemId()));

  readonly orderFound = computed(() =>
    this.type() === 'plan' ? !!this.plan() : !!this.topUp()
  );

  readonly totalPrice = computed(() => {
    if (this.type() === 'plan') {
      const plan = this.plan();
      if (!plan) {
        return 0;
      }
      return this.cycle() === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    }
    return this.topUp()?.price ?? 0;
  });

  constructor(
    route: ActivatedRoute,
    readonly account: AccountService,
    private readonly billing: BillingService,
    readonly translate: TranslateService,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.checkoutTitle));
    route.queryParamMap.subscribe((params) => {
      this.type.set(params.get('type') === 'topup' ? 'topup' : 'plan');
      this.itemId.set(params.get('id') ?? '');
      const cycleParam = params.get('cycle');
      this.cycle.set(cycleParam === 'yearly' ? 'yearly' : 'monthly');
    });
  }

  formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }

  proceedToCheckout(): void {
    this.errorMessage.set(null);
    this.isRedirecting.set(true);

    const request$ =
      this.type() === 'plan'
        ? this.billing.createSubscriptionCheckout(
            this.itemId().toUpperCase() as BackendPlanId,
            this.cycle().toUpperCase() as BackendBillingCycle
          )
        : this.billing.createTopUpCheckout(this.itemId());

    request$.subscribe({
      next: (session) => {
        window.location.href = session.url;
      },
      error: () => {
        this.isRedirecting.set(false);
        this.errorMessage.set(this.translate.dict().checkoutPage.errorCheckout);
      },
    });
  }
}
