import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  effect,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarouselComponent } from '../../shared/components/carousel/carousel.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { TranslateService } from '../../core/services/translate.service';
import { AccountService } from '../../core/services/account.service';
import { VoiceGender, VoiceLibraryService, VoiceTone } from '../../core/services/voice-library.service';
import { VoicePreviewService, PreviewableVoice } from '../../core/services/voice-preview.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { SeoService } from '../../core/services/seo.service';

const FEATURED_PLAN_INDICES = [0, 2, 5];

@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    CarouselComponent,
    StarRatingComponent,
    PublicNavComponent,
    PublicFooterComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('reveal', { read: ElementRef }) revealEls?: QueryList<ElementRef<HTMLElement>>;

  readonly waveformBars = Array.from({ length: 28 }, (_, i) => i);
  readonly openFaqIndex = signal<number | null>(0);

  private revealObserver?: IntersectionObserver;
  private revealFallbackTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly translate: TranslateService,
    readonly account: AccountService,
    readonly voiceLibrary: VoiceLibraryService,
    readonly voicePreview: VoicePreviewService,
    readonly feedback: FeedbackService,
    private readonly seo: SeoService
  ) {
    this.seo.setJsonLd('ld-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'NWM',
      url: 'https://nwm.app/',
      logo: 'https://nwm.app/og-image.png',
    });
    effect(() => {
      const dict = this.translate.dict();
      this.seo.update({
        title: dict.seo.landingTitle,
        description: dict.seo.landingDescription,
        path: '/',
        locale: dict.seo.ogLocale,
      });
      this.seo.setJsonLd('ld-faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: dict.landingFaq.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      });
    });
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.set(this.openFaqIndex() === index ? null : index);
  }

  demoCharCountLabel(): string {
    const dict = this.translate.dict().landing;
    return dict.demoCharCount.replace('{n}', String(dict.demoScriptSample.length));
  }

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

  waveBarHeight(index: number): number {
    return 0.15 + (index % 7) * 0.11;
  }

  voiceMetaLabel(voice: { gender: VoiceGender; tone: VoiceTone }): string {
    const dict = this.translate.dict().voicesPage;
    const gender = voice.gender === 'male' ? dict.genderMale : dict.genderFemale;
    const toneLabels: Record<VoiceTone, string> = {
      confident: dict.toneConfident,
      calm: dict.toneCalm,
      energetic: dict.toneEnergetic,
      warm: dict.toneWarm,
      neutral: dict.toneNeutral,
    };
    return `${gender} / ${toneLabels[voice.tone]}`;
  }
}
