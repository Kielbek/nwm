import { Injectable, signal } from '@angular/core';

export interface CookiePreferences {
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'nwm-cookie-consent';

interface StoredConsent extends CookiePreferences {
  decided: true;
}

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly stored = this.readStored();

  readonly hasDecided = signal(!!this.stored);
  readonly analytics = signal(this.stored?.analytics ?? false);
  readonly marketing = signal(this.stored?.marketing ?? false);

  /** Forces the banner back open (e.g. from Settings "manage cookies"), even after a decision was made. */
  readonly promptOpen = signal(false);

  openPreferences(): void {
    this.promptOpen.set(true);
  }

  acceptAll(): void {
    this.save({ analytics: true, marketing: true });
  }

  rejectAll(): void {
    this.save({ analytics: false, marketing: false });
  }

  savePreferences(preferences: CookiePreferences): void {
    this.save(preferences);
  }

  private save(preferences: CookiePreferences): void {
    this.analytics.set(preferences.analytics);
    this.marketing.set(preferences.marketing);
    this.hasDecided.set(true);
    this.promptOpen.set(false);

    if (typeof window === 'undefined') {
      return;
    }
    const record: StoredConsent = { ...preferences, decided: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  }

  private readStored(): StoredConsent | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parsed?.decided ? (parsed as StoredConsent) : null;
    } catch {
      return null;
    }
  }
}
