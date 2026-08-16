import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AccountService, BillingCycle, PlanId } from '../../core/services/account.service';
import { TranslateService } from '../../core/services/translate.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
  readonly editingProfile = signal(false);
  readonly formName = signal('');
  readonly formEmail = signal('');

  readonly purchaseToast = signal<number | null>(null);
  private purchaseToastTimeout?: ReturnType<typeof setTimeout>;

  readonly renewsInLabel = computed(() =>
    this.translate
      .dict()
      .profilePage.renewsIn.replace('{days}', String(this.account.renewalDaysLeft()))
  );

  readonly usageLabel = computed(
    () =>
      `${this.formatNumber(this.account.charactersUsed())} / ${this.formatNumber(this.account.characterLimit())}`
  );

  constructor(readonly account: AccountService, readonly translate: TranslateService) {}

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
    this.account.selectPlan(id);
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

  buyPack(topUp: { characters: number; price: number }): void {
    this.account.buyTopUp(topUp);
    this.purchaseToast.set(topUp.characters);
    if (this.purchaseToastTimeout) {
      clearTimeout(this.purchaseToastTimeout);
    }
    this.purchaseToastTimeout = setTimeout(() => this.purchaseToast.set(null), 3200);
  }

  formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }

  formatPrice(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }
}
