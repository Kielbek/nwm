import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

/**
 * Landing target for Stripe's success_url. The webhook (not this page) is
 * what actually applies the plan/character change — we just refetch the
 * user once so the header/profile reflect it as soon as it's landed.
 */
@Component({
  selector: 'app-checkout-success-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './checkout-success-page.component.html',
  styleUrl: './checkout-page.component.scss',
})
export class CheckoutSuccessPageComponent {
  constructor(auth: AuthService, readonly translate: TranslateService, seo: SeoService) {
    effect(() => seo.setPrivateTitle(this.translate.dict().checkoutPage.successGenericTitle));
    auth.refreshCurrentUser().subscribe();
  }
}
