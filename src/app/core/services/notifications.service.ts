import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { IconName } from '../../shared/components/icon/icon.component';
import { TranslateService } from './translate.service';
import { AccountService } from './account.service';
import { formatRelativeTime } from '../utils/relative-time';

export interface NotificationItem {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  time: string;
  link?: string;
  read: boolean;
}

type BackendNotificationType =
  | 'WELCOME'
  | 'GENERATION_COMPLETED'
  | 'GENERATION_FAILED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_SUCCEEDED'
  | 'TOPUP_PURCHASED';

interface BackendNotification {
  id: string;
  type: BackendNotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface Page<T> {
  content: T[];
}

const TYPE_ICON: Record<BackendNotificationType, IconName> = {
  WELCOME: 'sparkle',
  GENERATION_COMPLETED: 'check',
  GENERATION_FAILED: 'close',
  SUBSCRIPTION_ACTIVATED: 'star',
  SUBSCRIPTION_CANCELED: 'calendar',
  PAYMENT_FAILED: 'close',
  PAYMENT_SUCCEEDED: 'check',
  TOPUP_PURCHASED: 'download',
};

const STORAGE_KEY = 'nwm-notifications-read';
const USAGE_ALERT_THRESHOLD = 70;
const RENEWAL_ALERT_THRESHOLD_DAYS = 14;

/**
 * Backed by GET /api/notifications (a Page<NotificationResponse>, not a flat
 * array) when it's reachable. Falls back to a locally computed list that
 * mixes live account signals (usage/renewal alerts) with a handful of seeded
 * product notifications — same fallback pattern used across this app's
 * other services, and what runs before the user is authenticated.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly apiUrl = '/api/notifications';
  private readonly remoteItems = signal<NotificationItem[] | null>(null);
  private readonly remoteUnreadCount = signal<number | null>(null);
  private readonly readIds = signal<Set<string>>(this.readStoredIds());

  readonly items = computed<NotificationItem[]>(() => this.remoteItems() ?? this.localItems());

  readonly unreadCount = computed(
    () => this.remoteUnreadCount() ?? this.items().filter((item) => !item.read).length
  );

  constructor(
    private readonly http: HttpClient,
    private readonly translate: TranslateService,
    private readonly account: AccountService
  ) {
    this.load();
  }

  private load(): void {
    this.http
      .get<Page<BackendNotification>>(this.apiUrl)
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (!page) {
          return;
        }
        this.remoteItems.set(page.content.map((n) => this.mapNotification(n)));
      });

    this.http
      .get<{ count: number }>(`${this.apiUrl}/unread-count`)
      .pipe(catchError(() => of(null)))
      .subscribe((result) => {
        if (result) {
          this.remoteUnreadCount.set(result.count);
        }
      });
  }

  isRead(id: string): boolean {
    return this.items().find((item) => item.id === id)?.read ?? false;
  }

  markRead(id: string): void {
    if (this.isRead(id)) {
      return;
    }

    if (this.remoteItems()) {
      this.http
        .post(`${this.apiUrl}/${id}/read`, {})
        .pipe(catchError(() => of(null)))
        .subscribe(() => {
          this.remoteItems.update(
            (items) => items?.map((item) => (item.id === id ? { ...item, read: true } : item)) ?? null
          );
          this.remoteUnreadCount.update((count) => (count ? Math.max(0, count - 1) : count));
        });
      return;
    }

    const next = new Set(this.readIds());
    next.add(id);
    this.readIds.set(next);
    this.persist(next);
  }

  markAllRead(): void {
    if (this.remoteItems()) {
      this.http
        .post(`${this.apiUrl}/read-all`, {})
        .pipe(catchError(() => of(null)))
        .subscribe(() => {
          this.remoteItems.update((items) => items?.map((item) => ({ ...item, read: true })) ?? null);
          this.remoteUnreadCount.set(0);
        });
      return;
    }

    const next = new Set(this.readIds());
    this.items().forEach((item) => next.add(item.id));
    this.readIds.set(next);
    this.persist(next);
  }

  private mapNotification(n: BackendNotification): NotificationItem {
    return {
      id: n.id,
      icon: TYPE_ICON[n.type] ?? 'bell',
      title: n.title,
      body: n.body,
      time: formatRelativeTime(n.createdAt, this.translate.dict().historyPage),
      link: n.link ?? undefined,
      read: n.read,
    };
  }

  private localItems(): NotificationItem[] {
    const dict = this.translate.dict().notifications;
    const items: Omit<NotificationItem, 'read'>[] = [];

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
        link: '/app/profile',
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
        link: '/app/profile',
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
        link: '/app/voices',
      },
      {
        id: 'tip',
        icon: 'help',
        title: dict.tipTitle,
        body: dict.tipBody,
        time: dict.tipTime,
      }
    );

    return items.map((item) => ({ ...item, read: this.readIds().has(item.id) }));
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
