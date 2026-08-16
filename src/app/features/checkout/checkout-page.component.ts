import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AccountService, BillingCycle } from '../../core/services/account.service';
import { TranslateService } from '../../core/services/translate.service';

type CheckoutType = 'plan' | 'topup';

const PROCESSING_DELAY_MS = 1100;

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
})
export class CheckoutPageComponent {
  readonly type = signal<CheckoutType>('plan');
  readonly itemId = signal('');
  readonly cycle = signal<BillingCycle>('monthly');

  readonly cardholderName = signal('');
  readonly cardNumber = signal('');
  readonly expiry = signal('');
  readonly cvc = signal('');

  readonly formError = signal<string | null>(null);
  readonly isProcessing = signal(false);
  readonly isComplete = signal(false);

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

  readonly successMessage = computed(() => {
    const dict = this.translate.dict().checkoutPage;
    if (this.type() === 'plan') {
      return dict.successPlanBody.replace('{plan}', this.plan()?.name ?? '');
    }
    const topUp = this.topUp();
    const characters = topUp ? this.formatNumber(topUp.characters) : '';
    return dict.successTopUpBody.replace('{characters}', characters);
  });

  constructor(
    route: ActivatedRoute,
    readonly account: AccountService,
    readonly translate: TranslateService
  ) {
    route.queryParamMap.subscribe((params) => {
      this.type.set(params.get('type') === 'topup' ? 'topup' : 'plan');
      this.itemId.set(params.get('id') ?? '');
      const cycleParam = params.get('cycle');
      this.cycle.set(cycleParam === 'yearly' ? 'yearly' : 'monthly');
    });
  }

  onCardNumberInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    this.cardNumber.set((digits.match(/.{1,4}/g) ?? []).join(' '));
  }

  onExpiryInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    this.expiry.set(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  }

  onCvcInput(value: string): void {
    this.cvc.set(value.replace(/\D/g, '').slice(0, 3));
  }

  formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }

  submit(): void {
    const dict = this.translate.dict().checkoutPage;

    if (
      !this.cardholderName().trim() ||
      !this.cardNumber().trim() ||
      !this.expiry().trim() ||
      !this.cvc().trim()
    ) {
      this.formError.set(dict.errorRequired);
      return;
    }
    if (this.cardNumber().replace(/\s/g, '').length !== 16) {
      this.formError.set(dict.errorCardNumber);
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(this.expiry())) {
      this.formError.set(dict.errorExpiry);
      return;
    }
    if (this.cvc().length !== 3) {
      this.formError.set(dict.errorCvc);
      return;
    }

    this.formError.set(null);
    this.isProcessing.set(true);

    setTimeout(() => {
      const plan = this.plan();
      const topUp = this.topUp();
      if (this.type() === 'plan' && plan) {
        this.account.selectPlan(plan.id);
        this.account.setBillingCycle(this.cycle());
      } else if (this.type() === 'topup' && topUp) {
        this.account.buyTopUp(topUp);
      }
      this.isProcessing.set(false);
      this.isComplete.set(true);
    }, PROCESSING_DELAY_MS);
  }
}
