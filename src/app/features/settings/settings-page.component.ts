import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { TranslateService, Lang } from '../../core/services/translate.service';
import { AccountService } from '../../core/services/account.service';
import { CookieConsentService } from '../../core/services/cookie-consent.service';

const NOTIFY_KEYS = {
  updates: 'nwm-notify-updates',
  usage: 'nwm-notify-usage',
  marketing: 'nwm-notify-marketing',
};

const TWO_FACTOR_KEY = 'nwm-2fa-enabled';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  readonly notifyUpdates = signal(this.readNotify(NOTIFY_KEYS.updates, true));
  readonly notifyUsage = signal(this.readNotify(NOTIFY_KEYS.usage, true));
  readonly notifyMarketing = signal(this.readNotify(NOTIFY_KEYS.marketing, false));
  readonly twoFactorEnabled = signal(this.readNotify(TWO_FACTOR_KEY, false));

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly passwordError = signal<string | null>(null);

  readonly savedToast = signal<string | null>(null);
  readonly resetConfirmOpen = signal(false);

  private toastTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly theme: ThemeService,
    readonly translate: TranslateService,
    readonly account: AccountService,
    readonly cookieConsent: CookieConsentService
  ) {}

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  setLang(lang: Lang): void {
    this.translate.setLang(lang);
  }

  toggleNotifyUpdates(): void {
    this.notifyUpdates.update((v) => !v);
    this.writeNotify(NOTIFY_KEYS.updates, this.notifyUpdates());
    this.showToast(this.translate.dict().settingsPage.saved);
  }

  toggleNotifyUsage(): void {
    this.notifyUsage.update((v) => !v);
    this.writeNotify(NOTIFY_KEYS.usage, this.notifyUsage());
    this.showToast(this.translate.dict().settingsPage.saved);
  }

  toggleNotifyMarketing(): void {
    this.notifyMarketing.update((v) => !v);
    this.writeNotify(NOTIFY_KEYS.marketing, this.notifyMarketing());
    this.showToast(this.translate.dict().settingsPage.saved);
  }

  changePassword(): void {
    const dict = this.translate.dict().settingsPage;
    this.passwordError.set(null);

    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set(dict.passwordMismatch);
      return;
    }
    if (this.newPassword().length < 8) {
      this.passwordError.set(dict.passwordTooShort);
      return;
    }

    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showToast(dict.passwordChanged);
  }

  toggleTwoFactor(): void {
    this.twoFactorEnabled.update((v) => !v);
    this.writeNotify(TWO_FACTOR_KEY, this.twoFactorEnabled());
    this.showToast(this.translate.dict().settingsPage.saved);
  }

  manageCookies(): void {
    this.cookieConsent.openPreferences();
  }

  exportData(): void {
    const payload = {
      profile: { name: this.account.name(), email: this.account.email() },
      plan: this.account.planId(),
      billingCycle: this.account.billingCycle(),
      charactersUsed: this.account.charactersUsed(),
      bonusCharacters: this.account.bonusCharacters(),
      purchases: this.account.purchases(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nwm-account-data.json';
    link.click();
    URL.revokeObjectURL(url);

    this.showToast(this.translate.dict().settingsPage.exportDone);
  }

  startReset(): void {
    this.resetConfirmOpen.set(true);
  }

  cancelReset(): void {
    this.resetConfirmOpen.set(false);
  }

  confirmReset(): void {
    this.account.resetAccount();
    this.resetConfirmOpen.set(false);
    this.showToast(this.translate.dict().settingsPage.resetDone);
  }

  private showToast(message: string): void {
    this.savedToast.set(message);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => this.savedToast.set(null), 2800);
  }

  private readNotify(key: string, fallback: boolean): boolean {
    if (typeof window === 'undefined') {
      return fallback;
    }
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === '1';
  }

  private writeNotify(key: string, value: boolean): void {
    localStorage.setItem(key, value ? '1' : '0');
  }
}
