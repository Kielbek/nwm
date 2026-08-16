import { Injectable, computed, signal } from '@angular/core';
import { AccountService } from './account.service';

const STORAGE_KEY = 'nwm-referral-code';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * Generates a stable per-device referral code (persisted to localStorage,
 * derived from the account's name plus a random suffix on first use).
 * There's no backend to actually track invites/rewards yet, so this only
 * produces a shareable link — it doesn't simulate sent invites.
 */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  readonly isOpen = signal(false);
  readonly code = signal(this.readOrCreateCode());

  readonly referralLink = computed(() => `https://nwm.app/r/${this.code()}`);

  constructor(private readonly account: AccountService) {}

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  private readOrCreateCode(): string {
    if (typeof window === 'undefined') {
      return this.generateCode();
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const created = this.generateCode();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  }

  private generateCode(): string {
    const namePart = (this.account?.name() ?? 'NWM')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 4)
      .toUpperCase();
    let suffix = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return `${namePart || 'NWM'}${suffix}`;
  }
}
