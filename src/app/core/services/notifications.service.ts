import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { IconName } from '../../shared/components/icon/icon.component';
import { TranslateService } from './translate.service';
import { AccountService } from './account.service';

export interface NotificationItem {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  time: string;
  link?: string;
}

const STORAGE_KEY = 'nwm-notifications-read';
const USAGE_ALERT_THRESHOLD = 70;
const RENEWAL_ALERT_THRESHOLD_DAYS = 14;

/**
 * Talks to a backend at /api/notifications when one is configured. Without
 * a backend, falls back to a locally computed list that mixes live account
 * signals (usage/renewal alerts) with a handful of seeded product
 * notifications — same fallback pattern used across this app's other
 * services.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly apiUrl = '/api/notifications';
  private readonly remoteItems = signal<NotificationItem[] | null>(null);
  private readonly readIds = signal<Set<string>>(this.readStoredIds());

  readonly items = computed<NotificationItem[]>(() => this.remoteItems() ?? this.localItems());

  readonly unreadCount = computed(
    () => this.items().filter((item) => !this.readIds().has(item.id)).length
  );

  constructor(
    private readonly http: HttpClient,
    private readonly translate: TranslateService,
    private readonly account: AccountService
  ) {
    this.http
      .get<NotificationItem[]>(this.apiUrl)
      .pipe(catchError(() => of(null)))
      .subscribe((items) => this.remoteItems.set(items));
  }

  isRead(id: string): boolean {
    return this.readIds().has(id);
  }

  markRead(id: string): void {
    if (this.readIds().has(id)) {
      return;
    }
    const next = new Set(this.readIds());
    next.add(id);
    this.readIds.set(next);
    this.persist(next);
  }

  markAllRead(): void {
    const next = new Set(this.readIds());
    this.items().forEach((item) => next.add(item.id));
    this.readIds.set(next);
    this.persist(next);
  }

  private localItems(): NotificationItem[] {
    const dict = this.translate.dict().notifications;
    const items: NotificationItem[] = [];

    const usagePercent = Math.round(this.account.usagePercent());
    if (usagePercent >= USAGE_ALERT_THRESHOLD) {
      items.push({
        id: 'usage-alert',
        icon: 'bell',
        title: dict.usageTitle,
        body: dict.usageBody
          .replace('{percent}', String(usagePercent))
          .replace('{plan}', this.account.currentPlan().name),
        time: dict.justNow,
        link: '/profile',
      });
    }

    const renewalDays = this.account.renewalDaysLeft();
    if (renewalDays <= RENEWAL_ALERT_THRESHOLD_DAYS) {
      items.push({
        id: 'renewal-reminder',
        icon: 'calendar',
        title: dict.renewalTitle,
        body: dict.renewalBody
          .replace('{plan}', this.account.currentPlan().name)
          .replace('{days}', String(renewalDays)),
        time: dict.justNow,
        link: '/profile',
      });
    }

    items.push(
      {
        id: 'welcome',
        icon: 'sparkle',
        title: dict.welcomeTitle,
        body: dict.welcomeBody,
        time: dict.welcomeTime,
      },
      {
        id: 'new-voice',
        icon: 'voices',
        title: dict.newVoiceTitle,
        body: dict.newVoiceBody,
        time: dict.newVoiceTime,
        link: '/voices',
      },
      {
        id: 'tip',
        icon: 'help',
        title: dict.tipTitle,
        body: dict.tipBody,
        time: dict.tipTime,
      }
    );

    return items;
  }

  private persist(ids: Set<string>): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }

  private readStoredIds(): Set<string> {
    if (typeof window === 'undefined') {
      return new Set();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }
}
