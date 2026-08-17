import { ChangeDetectionStrategy, Component, HostListener, computed } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { UpgradeModalService } from '../../../core/services/upgrade-modal.service';
import { AccountService, BillingCycle, PlanId } from '../../../core/services/account.service';
import { TranslateService } from '../../../core/services/translate.service';

const FEATURED_PLAN_ID: PlanId = 'pro';

/**
 * Shown when the user tries to generate more speech than their remaining
 * quota allows. Only lists plans with more capacity than the current one —
 * there's no point upselling a plan that wouldn't actually fix the problem.
 */
@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './upgrade-modal.component.html',
  styleUrl: './upgrade-modal.component.scss',
})
export class UpgradeModalComponent {
  readonly featuredPlanId = FEATURED_PLAN_ID;

  readonly upgradePlans = computed(() =>
    this.account.plans().filter((plan) => plan.characterLimit > this.account.characterLimit())
  );

  constructor(
    readonly modal: UpgradeModalService,
    readonly account: AccountService,
    readonly translate: TranslateService,
    private readonly router: Router
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.isOpen()) {
      this.modal.close();
    }
  }

  setBillingCycle(cycle: BillingCycle): void {
    this.account.setBillingCycle(cycle);
  }

  choosePlan(planId: PlanId): void {
    this.modal.close();
    this.router.navigate(['/app/checkout'], {
      queryParams: { type: 'plan', id: planId, cycle: this.account.billingCycle() },
    });
  }

  goToPlans(): void {
    this.modal.close();
    this.router.navigateByUrl('/app/profile');
  }

  formatPrice(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }
}
