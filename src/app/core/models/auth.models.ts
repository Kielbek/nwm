export type BackendPlanId = 'FREE' | 'STARTER' | 'PRO' | 'CREATOR' | 'PREMIUM' | 'BUSINESS';
export type BackendBillingCycle = 'MONTHLY' | 'YEARLY';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  planId: BackendPlanId;
  billingCycle: BackendBillingCycle;
  charactersUsed: number;
  characterLimit: number;
  bonusCharacters: number;
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
