import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackendBillingCycle, BackendPlanId } from '../models/auth.models';

export interface CheckoutSessionResponse {
  url: string;
}

/** Every mutation here just returns a Stripe-hosted URL to redirect the browser to — the backend/Stripe webhook is what actually updates plan/character state, not this service. */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly base = `${environment.apiUrl}/api/billing`;

  constructor(private readonly http: HttpClient) {}

  createSubscriptionCheckout(
    planId: BackendPlanId,
    billingCycle: BackendBillingCycle
  ): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(`${this.base}/checkout/subscription`, {
      planId,
      billingCycle,
    });
  }

  createTopUpCheckout(topUpId: string): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(`${this.base}/checkout/topup`, { topUpId });
  }

  openBillingPortal(): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>(`${this.base}/portal`, {});
  }

  cancelSubscription(): Observable<void> {
    return this.http.post<void>(`${this.base}/subscription/cancel`, {});
  }
}
