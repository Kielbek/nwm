import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { EnterAppLinkDirective } from '../../shared/directives/enter-app-link.directive';
import { TranslateService } from '../../core/services/translate.service';
import { AccountService, BillingCycle } from '../../core/services/account.service';
import { SeoService } from '../../core/services/seo.service';

const FEATURED_PLAN_INDEX = 2;

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    PublicNavComponent,
    PublicFooterComponent,
    FaqAccordionComponent,
    EnterAppLinkDirective,
  ],
  templateUrl: './pricing-page.component.html',
  styleUrl: './pricing-page.component.scss',
})
export class PricingPageComponent {
  readonly billingCycle = signal<BillingCycle>('monthly');
  readonly featuredPlanIndex = FEATURED_PLAN_INDEX;

  constructor(
    readonly translate: TranslateService,
    readonly account: AccountService,
    private readonly seo: SeoService
  ) {
    this.seo.removeJsonLd('ld-organization');
    effect(() => {
      const dict = this.translate.dict();
      this.seo.update({
        title: dict.seo.pricingTitle,
        description: dict.seo.pricingDescription,
        path: '/pricing',
        locale: dict.seo.ogLocale,
      });
      this.seo.setJsonLd('ld-faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: dict.pricingFaq.map((faq) => ({
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

  setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  formatNumber(value: number): string {
    return value.toLocaleString(this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US');
  }
}
