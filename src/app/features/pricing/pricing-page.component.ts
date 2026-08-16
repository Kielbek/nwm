import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { TranslateService } from '../../core/services/translate.service';
import { AccountService, BillingCycle } from '../../core/services/account.service';

const FEATURED_PLAN_INDEX = 2;

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, PublicNavComponent, PublicFooterComponent],
  templateUrl: './pricing-page.component.html',
  styleUrl: './pricing-page.component.scss',
})
export class PricingPageComponent {
  readonly billingCycle = signal<BillingCycle>('monthly');
  readonly openFaqIndex = signal<number | null>(null);
  readonly featuredPlanIndex = FEATURED_PLAN_INDEX;

  constructor(readonly translate: TranslateService, readonly account: AccountService) {}

  setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.set(this.openFaqIndex() === index ? null : index);
  }

  formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }
}
