import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarouselComponent } from '../../shared/components/carousel/carousel.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { TranslateService, Lang } from '../../core/services/translate.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { AccountService } from '../../core/services/account.service';
import { VoiceLibraryService } from '../../core/services/voice-library.service';
import { VoicePreviewService, PreviewableVoice } from '../../core/services/voice-preview.service';
import { FeedbackService } from '../../core/services/feedback.service';

const FEATURED_PLAN_INDICES = [0, 2, 5];

@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, CarouselComponent, StarRatingComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('reveal', { read: ElementRef }) revealEls?: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('statValue', { read: ElementRef }) statValueEls?: QueryList<
    ElementRef<HTMLElement>
  >;

  readonly currentYear = new Date().getFullYear();
  readonly waveformBars = Array.from({ length: 28 }, (_, i) => i);

  private revealObserver?: IntersectionObserver;
  private statsAnimated = false;
  private revealFallbackTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly translate: TranslateService,
    readonly theme: ThemeService,
    readonly account: AccountService,
    readonly voiceLibrary: VoiceLibraryService,
    readonly voicePreview: VoicePreviewService,
    readonly feedback: FeedbackService
  ) {}

  get featuredPlans() {
    const plans = this.account.plans();
    return FEATURED_PLAN_INDICES.map((i) => plans[i]).filter(Boolean);
  }

  ngAfterViewInit(): void {
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add('is-visible');
          this.revealObserver?.unobserve(entry.target);
          if (entry.target.classList.contains('landing__stats') && !this.statsAnimated) {
            this.statsAnimated = true;
            this.animateStats();
          }
        }
      },
      { threshold: 0.15 }
    );
    this.revealEls?.forEach((ref) => this.revealObserver!.observe(ref.nativeElement));
    this.revealEls?.changes.subscribe((list: QueryList<ElementRef<HTMLElement>>) => {
      list.forEach((ref) => this.revealObserver!.observe(ref.nativeElement));
    });

    // Safety net: guarantee every section becomes visible even if the
    // IntersectionObserver never fires for it (fast scrolling, odd viewport
    // resizes, etc.) — a landing page should never have permanently blank
    // sections.
    this.revealFallbackTimeout = setTimeout(() => {
      this.revealEls?.forEach((ref) => ref.nativeElement.classList.add('is-visible'));
      if (!this.statsAnimated) {
        this.statsAnimated = true;
        this.animateStats();
      }
    }, 2500);
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    clearTimeout(this.revealFallbackTimeout);
    this.voicePreview.stop();
  }

  togglePreview(voice: PreviewableVoice, event: Event): void {
    event.stopPropagation();
    this.voicePreview.toggle(voice);
  }

  scrollToId(id: string, event: Event): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setLang(lang: Lang): void {
    this.translate.setLang(lang);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  private animateStats(): void {
    const duration = 900;
    this.statValueEls?.forEach((ref) => {
      const el = ref.nativeElement;
      const raw = el.textContent?.trim() ?? '';
      const match = raw.match(/^(\d+)(.*)$/);
      if (!match) {
        return;
      }
      const target = parseInt(match[1], 10);
      const suffix = match[2];
      const start = performance.now();

      const step = (now: number): void => {
        const progress = Math.min(1, (now - start) / duration);
        el.textContent = `${Math.round(target * progress)}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    });
  }
}
