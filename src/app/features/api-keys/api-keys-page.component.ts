import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  effect,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AccountService, PlanId } from '../../core/services/account.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';
import { ApiDocsService } from '../../core/services/api-docs.service';

/** Plans at this rank or above unlock API key access — mirrors the profileFaq copy about API keys. */
const API_KEYS_MIN_PLAN: PlanId = 'creator';

@Component({
  selector: 'app-api-keys-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './api-keys-page.component.html',
  styleUrl: './api-keys-page.component.scss',
})
export class ApiKeysPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollRoot') scrollRootRef?: ElementRef<HTMLElement>;
  @ViewChildren('sectionEl') sectionEls?: QueryList<ElementRef<HTMLElement>>;

  readonly hasApiAccess = computed(
    () => this.account.planRank(this.account.planId()) >= this.account.planRank(API_KEYS_MIN_PLAN)
  );
  readonly maskedApiKey = 'sk-live-••••••••••••••••';
  readonly copied = signal(false);
  readonly copiedCodeId = signal<string | null>(null);
  readonly activeSectionId = signal<string | null>(null);

  private copiedTimeout?: ReturnType<typeof setTimeout>;
  private copiedCodeTimeout?: ReturnType<typeof setTimeout>;
  private observer?: IntersectionObserver;
  private suppressObserverUntil = 0;

  constructor(
    readonly account: AccountService,
    readonly translate: TranslateService,
    readonly docs: ApiDocsService,
    private readonly router: Router,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().profilePage.apiKeysTitle));
  }

  ngAfterViewInit(): void {
    this.setupObserver();
    this.sectionEls?.changes.subscribe(() => this.setupObserver());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    if (this.copiedCodeTimeout) {
      clearTimeout(this.copiedCodeTimeout);
    }
  }

  copyKey(): void {
    navigator.clipboard?.writeText(this.maskedApiKey).then(() => {
      this.copied.set(true);
      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }
      this.copiedTimeout = setTimeout(() => this.copied.set(false), 2000);
    });
  }

  copyCode(id: string, code: string): void {
    navigator.clipboard?.writeText(code).then(() => {
      this.copiedCodeId.set(id);
      if (this.copiedCodeTimeout) {
        clearTimeout(this.copiedCodeTimeout);
      }
      this.copiedCodeTimeout = setTimeout(() => this.copiedCodeId.set(null), 1800);
    });
  }

  scrollTo(id: string): void {
    this.activeSectionId.set(id);
    this.suppressObserverUntil = Date.now() + 700;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  upgrade(): void {
    this.router.navigate(['/app/checkout'], {
      queryParams: { type: 'plan', id: API_KEYS_MIN_PLAN, cycle: this.account.billingCycle() },
    });
  }

  private setupObserver(): void {
    this.observer?.disconnect();
    if (!this.sectionEls || !this.scrollRootRef) {
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < this.suppressObserverUntil) {
          return;
        }
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) {
          this.activeSectionId.set(visible[0].target.id);
        }
      },
      { root: this.scrollRootRef.nativeElement, rootMargin: '-72px 0px -65% 0px', threshold: 0 }
    );
    this.sectionEls.forEach((el) => this.observer!.observe(el.nativeElement));
  }
}
