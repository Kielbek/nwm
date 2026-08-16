import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { CookieConsentService } from '../../../core/services/cookie-consent.service';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss',
})
export class CookieBannerComponent {
  readonly customizing = signal(false);
  readonly draftAnalytics = signal(false);
  readonly draftMarketing = signal(false);

  readonly visible = computed(() => !this.consent.hasDecided() || this.consent.promptOpen());

  constructor(readonly consent: CookieConsentService, readonly translate: TranslateService) {
    effect(
      () => {
        if (this.consent.promptOpen()) {
          this.draftAnalytics.set(this.consent.analytics());
          this.draftMarketing.set(this.consent.marketing());
          this.customizing.set(true);
        }
      },
      { allowSignalWrites: true }
    );
  }

  openCustomize(): void {
    this.draftAnalytics.set(this.consent.analytics());
    this.draftMarketing.set(this.consent.marketing());
    this.customizing.set(true);
  }

  backToSimple(): void {
    this.customizing.set(false);
  }

  acceptAll(): void {
    this.consent.acceptAll();
    this.customizing.set(false);
  }

  rejectAll(): void {
    this.consent.rejectAll();
    this.customizing.set(false);
  }

  toggleAnalytics(): void {
    this.draftAnalytics.update((v) => !v);
  }

  toggleMarketing(): void {
    this.draftMarketing.update((v) => !v);
  }

  savePreferences(): void {
    this.consent.savePreferences({
      analytics: this.draftAnalytics(),
      marketing: this.draftMarketing(),
    });
    this.customizing.set(false);
  }
}
