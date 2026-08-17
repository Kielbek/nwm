import { Injectable, computed, effect, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { TranslateService } from './translate.service';
import { AuthService } from './auth.service';
import { BackendBillingCycle, BackendPlanId } from '../models/auth.models';

export type PlanId = 'free' | 'starter' | 'pro' | 'creator' | 'premium' | 'business';
export type BillingCycle = 'monthly' | 'yearly';

interface PlanMeta {
  id: PlanId;
  monthlyPrice: number;
  yearlyPrice: number;
  characterLimit: number;
}

interface TopUpMeta {
  id: string;
  characters: number;
  price: number;
}

export interface Purchase {
  id: string;
  characters: number;
  price: number;
  date: string;
}

const PLAN_META: PlanMeta[] = [
  { id: 'free', monthlyPrice: 0, yearlyPrice: 0, characterLimit: 10_000 },
  { id: 'starter', monthlyPrice: 15, yearlyPrice: 144, characterLimit: 60_000 },
  { id: 'pro', monthlyPrice: 39, yearlyPrice: 374, characterLimit: 300_000 },
  { id: 'creator', monthlyPrice: 79, yearlyPrice: 758, characterLimit: 700_000 },
  { id: 'premium', monthlyPrice: 129, yearlyPrice: 1238, characterLimit: 1_500_000 },
  { id: 'business', monthlyPrice: 299, yearlyPrice: 2870, characterLimit: 5_000_000 },
];

const TOP_UP_META: TopUpMeta[] = [
  { id: 'small', characters: 50_000, price: 19 },
  { id: 'medium', characters: 200_000, price: 59 },
  { id: 'large', characters: 500_000, price: 129 },
];

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'creator', 'premium', 'business'];

@Injectable({ providedIn: 'root' })
export class AccountService {
  readonly name = signal('');
  readonly email = signal('');
  readonly planId = signal<PlanId>('free');
  readonly billingCycle = signal<BillingCycle>('monthly');

  readonly charactersUsed = signal(0);
  readonly bonusCharacters = signal(0);
  readonly emailVerified = signal(false);
  readonly purchases = signal<Purchase[]>([]);
  readonly renewalDaysLeft = signal(14);
  readonly memberSince = new Date();

  readonly plans = computed(() =>
    PLAN_META.map((meta, i) => ({ ...meta, ...this.translate.dict().plans[i] }))
  );

  readonly topUps = computed(() =>
    TOP_UP_META.map((meta, i) => ({ ...meta, ...this.translate.dict().topUps[i] }))
  );

  readonly currentPlan = computed(
    () => this.plans().find((p) => p.id === this.planId()) ?? this.plans()[0]
  );

  readonly characterLimit = computed(
    () => this.currentPlan().characterLimit + this.bonusCharacters()
  );

  readonly usagePercent = computed(() =>
    Math.min(100, (this.charactersUsed() / this.characterLimit()) * 100)
  );

  readonly initials = computed(() =>
    this.name()
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
  );

  constructor(private readonly translate: TranslateService, private readonly auth: AuthService) {
    // Mirrors the authenticated backend user onto the same signals every
    // existing consumer (header, profile, settings, notifications) already
    // reads — so none of them need to know AccountService used to be a
    // localStorage mock. Cleared back to defaults on sign-out.
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.name.set(user.name);
        this.email.set(user.email);
        this.emailVerified.set(user.emailVerified);
        this.planId.set(this.mapPlanId(user.planId));
        this.billingCycle.set(this.mapBillingCycle(user.billingCycle));
        this.charactersUsed.set(user.charactersUsed);
        this.bonusCharacters.set(user.bonusCharacters);
      } else if (this.auth.ready()) {
        this.resetLocalState();
      }
    }, { allowSignalWrites: true });
  }

  planRank(id: PlanId): number {
    return PLAN_ORDER.indexOf(id);
  }

  /**
   * Local-only preview toggle for the plan carousel's monthly/yearly price
   * display — NOT a change to the user's actual subscribed cycle (that only
   * changes via a real Stripe checkout/portal flow and is re-synced from the
   * backend on the next `currentUser()` update).
   */
  setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  /** Updates the account's display name against the real backend (email/plan changes go through their own flows). */
  updateProfile(name: string): Observable<void> {
    return this.auth.updateName(name).pipe(map(() => undefined));
  }

  resetLocalState(): void {
    this.name.set('');
    this.email.set('');
    this.emailVerified.set(false);
    this.planId.set('free');
    this.billingCycle.set('monthly');
    this.charactersUsed.set(0);
    this.bonusCharacters.set(0);
    this.purchases.set([]);
    this.renewalDaysLeft.set(30);
  }

  private mapPlanId(id: BackendPlanId): PlanId {
    return id.toLowerCase() as PlanId;
  }

  private mapBillingCycle(cycle: BackendBillingCycle): BillingCycle {
    return cycle.toLowerCase() as BillingCycle;
  }
}
