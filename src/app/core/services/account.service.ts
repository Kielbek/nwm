import { Injectable, computed, signal } from '@angular/core';
import { TranslateService } from './translate.service';

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

const STORAGE_KEYS = {
  name: 'nwm-account-name',
  email: 'nwm-account-email',
  plan: 'nwm-account-plan',
  cycle: 'nwm-account-cycle',
};

@Injectable({ providedIn: 'root' })
export class AccountService {
  readonly name = signal(this.readStored(STORAGE_KEYS.name, 'Marta Kowalska'));
  readonly email = signal(this.readStored(STORAGE_KEYS.email, 'marta.kowalska@example.com'));
  readonly planId = signal<PlanId>(this.readStored(STORAGE_KEYS.plan, 'pro') as PlanId);
  readonly billingCycle = signal<BillingCycle>(
    this.readStored(STORAGE_KEYS.cycle, 'monthly') as BillingCycle
  );

  readonly charactersUsed = signal(184_320);
  readonly bonusCharacters = signal(0);
  readonly purchases = signal<Purchase[]>([]);
  readonly renewalDaysLeft = signal(14);

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

  constructor(private readonly translate: TranslateService) {}

  planRank(id: PlanId): number {
    return PLAN_ORDER.indexOf(id);
  }

  selectPlan(id: PlanId): void {
    this.planId.set(id);
    this.write(STORAGE_KEYS.plan, id);
  }

  setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
    this.write(STORAGE_KEYS.cycle, cycle);
  }

  buyTopUp(topUp: { characters: number; price: number }): void {
    this.bonusCharacters.update((v) => v + topUp.characters);
    this.purchases.update((list) => [
      {
        id: `${Date.now()}`,
        characters: topUp.characters,
        price: topUp.price,
        date: new Date().toLocaleDateString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US'),
      },
      ...list,
    ]);
  }

  updateProfile(name: string, email: string): void {
    this.name.set(name);
    this.email.set(email);
    this.write(STORAGE_KEYS.name, name);
    this.write(STORAGE_KEYS.email, email);
  }

  private readStored(key: string, fallback: string): string {
    if (typeof window === 'undefined') {
      return fallback;
    }
    return localStorage.getItem(key) ?? fallback;
  }

  private write(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
}
