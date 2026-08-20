import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarouselComponent } from '../../shared/components/carousel/carousel.component';
import { AccountService, BillingCycle, PlanId } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { BillingService } from '../../core/services/billing.service';
import { GenerationHistoryService } from '../../core/services/generation-history.service';
import { VoiceLibraryService } from '../../core/services/voice-library.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';
import { OutputFormat } from '../../core/models/tts.models';

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Plans at this rank or above unlock API key access — mirrors the profileFaq copy about API keys. */
const API_KEYS_MIN_PLAN: PlanId = 'creator';

const PREF_KEYS = {
  voice: 'nwm-pref-default-voice',
  format: 'nwm-pref-default-format',
  speed: 'nwm-pref-default-speed',
};

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
  readonly isSavingProfile = signal(false);
  readonly isSendingVerification = signal(false);
  readonly verificationSent = signal(false);
  readonly isOpeningPortal = signal(false);

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

  // --- Bento stats — derived from the generation history actually loaded
  // in this session (same source of truth the History page itself uses),
  // not a fabricated total.
  readonly recordingsCount = computed(() => this.history.entries().length);

  readonly totalAudioMinutes = computed(() => {
    const totalSeconds = this.history
      .entries()
      .reduce((sum, entry) => sum + (entry.durationSeconds ?? 0), 0);
    return Math.round(totalSeconds / 60);
  });

  readonly favoriteVoiceName = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this.history.entries()) {
      counts.set(entry.voiceName, (counts.get(entry.voiceName) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [name, count] of counts) {
      if (count > bestCount) {
        best = name;
        bestCount = count;
      }
    }
    return best;
  });

  // --- Editor preferences — locally persisted, same pattern as the
  // notification toggles on the Settings page (no backend field for these).
  readonly defaultVoiceId = signal(this.readPref(PREF_KEYS.voice, ''));
  readonly defaultFormat = signal(this.readPref(PREF_KEYS.format, 'mp3-128') as OutputFormat);
  readonly defaultSpeed = signal(Number(this.readPref(PREF_KEYS.speed, '1')));
  readonly preferencesSavedToast = signal(false);
  private prefsToastTimeout?: ReturnType<typeof setTimeout>;

  // --- API keys paywall
  readonly hasApiAccess = computed(
    () => this.account.planRank(this.account.planId()) >= this.account.planRank(API_KEYS_MIN_PLAN)
  );
  readonly apiKeyCopied = signal(false);
  private apiKeyCopiedTimeout?: ReturnType<typeof setTimeout>;
  readonly maskedApiKey = 'sk-live-••••••••••••••••';

  // --- FAQ accordion
  readonly openFaqIndex = signal<number | null>(null);

  constructor(
    readonly account: AccountService,
    readonly history: GenerationHistoryService,
    readonly voiceLibrary: VoiceLibraryService,
    private readonly auth: AuthService,
    private readonly billing: BillingService,
    readonly translate: TranslateService,
    private readonly router: Router,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.profileTitle));
  }

  startEditingProfile(): void {
    this.formName.set(this.account.name());
    this.editingProfile.set(true);
  }

  saveProfile(): void {
    const name = this.formName().trim();
    if (!name || this.isSavingProfile()) {
      return;
    }
    this.isSavingProfile.set(true);
    this.account.updateProfile(name).subscribe({
      next: () => {
        this.isSavingProfile.set(false);
        this.editingProfile.set(false);
      },
      error: () => this.isSavingProfile.set(false),
    });
  }

  cancelEditingProfile(): void {
    this.editingProfile.set(false);
  }

  resendVerificationEmail(): void {
    if (this.isSendingVerification()) {
      return;
    }
    this.isSendingVerification.set(true);
    this.auth.resendVerificationEmail().subscribe({
      next: () => {
        this.isSendingVerification.set(false);
        this.verificationSent.set(true);
      },
      error: () => this.isSendingVerification.set(false),
    });
  }

  setBillingCycle(cycle: BillingCycle): void {
    this.account.setBillingCycle(cycle);
  }

  openBillingPortal(): void {
    if (this.isOpeningPortal()) {
      return;
    }
    this.isOpeningPortal.set(true);
    this.billing.openBillingPortal().subscribe({
      next: (session) => {
        window.location.href = session.url;
      },
      error: () => this.isOpeningPortal.set(false),
    });
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

  setDefaultFormat(format: OutputFormat): void {
    this.defaultFormat.set(format);
  }

  savePreferences(): void {
    this.writePref(PREF_KEYS.voice, this.defaultVoiceId());
    this.writePref(PREF_KEYS.format, this.defaultFormat());
    this.writePref(PREF_KEYS.speed, String(this.defaultSpeed()));

    this.preferencesSavedToast.set(true);
    if (this.prefsToastTimeout) {
      clearTimeout(this.prefsToastTimeout);
    }
    this.prefsToastTimeout = setTimeout(() => this.preferencesSavedToast.set(false), 2500);
  }

  copyApiKey(): void {
    navigator.clipboard?.writeText(this.maskedApiKey).then(() => {
      this.apiKeyCopied.set(true);
      if (this.apiKeyCopiedTimeout) {
        clearTimeout(this.apiKeyCopiedTimeout);
      }
      this.apiKeyCopiedTimeout = setTimeout(() => this.apiKeyCopied.set(false), 2000);
    });
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
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

  private readPref(key: string, fallback: string): string {
    if (typeof window === 'undefined') {
      return fallback;
    }
    return localStorage.getItem(key) ?? fallback;
  }

  private writePref(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}
