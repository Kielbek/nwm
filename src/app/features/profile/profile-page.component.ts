import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarouselComponent } from '../../shared/components/carousel/carousel.component';
import { AccountService, BillingCycle, PlanId } from '../../core/services/account.service';
import { TranslateService } from '../../core/services/translate.service';

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

@Component({
  selector: 'app-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, CarouselComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
  readonly editingProfile = signal(false);
  readonly formName = signal('');
  readonly formEmail = signal('');

  readonly ringCircumference = RING_CIRCUMFERENCE;

  readonly renewsInLabel = computed(() =>
    this.translate
      .dict()
      .profilePage.renewsIn.replace('{days}', String(this.account.renewalDaysLeft()))
  );

  readonly usageLabel = computed(
    () =>
      `${this.formatNumber(this.account.charactersUsed())} / ${this.formatNumber(this.account.characterLimit())}`
  );

  readonly usagePercentRounded = computed(() => Math.round(this.account.usagePercent()));

  readonly ringOffset = computed(
    () => RING_CIRCUMFERENCE * (1 - Math.min(100, this.account.usagePercent()) / 100)
  );

  readonly memberSinceLabel = computed(() =>
    this.translate
      .dict()
      .profilePage.memberSince.replace('{date}', this.formatMemberSince(this.account.memberSince))
  );

  constructor(
    readonly account: AccountService,
    readonly translate: TranslateService,
    private readonly router: Router
  ) {}

  startEditingProfile(): void {
    this.formName.set(this.account.name());
    this.formEmail.set(this.account.email());
    this.editingProfile.set(true);
  }

  saveProfile(): void {
    if (!this.formName().trim() || !this.formEmail().trim()) {
      return;
    }
    this.account.updateProfile(this.formName().trim(), this.formEmail().trim());
    this.editingProfile.set(false);
  }

  cancelEditingProfile(): void {
    this.editingProfile.set(false);
  }

  setBillingCycle(cycle: BillingCycle): void {
    this.account.setBillingCycle(cycle);
  }

  selectPlan(id: PlanId): void {
    this.router.navigate(['/app/checkout'], {
      queryParams: { type: 'plan', id, cycle: this.account.billingCycle() },
    });
  }

  planButtonLabel(id: PlanId, name: string): string {
    const dict = this.translate.dict().profilePage;
    if (id === this.account.planId()) {
      return dict.currentPlanBadge;
    }
    return this.account.planRank(id) > this.account.planRank(this.account.planId())
      ? `${dict.upgradeTo} ${name}`
      : `${dict.downgradeTo} ${name}`;
  }

  buyPack(topUp: { id: string }): void {
    this.router.navigate(['/app/checkout'], {
      queryParams: { type: 'topup', id: topUp.id },
    });
  }

  formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }

  formatPrice(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }

  private formatMemberSince(date: Date): string {
    return date.toLocaleDateString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
}
