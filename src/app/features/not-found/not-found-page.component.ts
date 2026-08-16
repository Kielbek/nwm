import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss',
})
export class NotFoundPageComponent {
  constructor(readonly translate: TranslateService, private readonly seo: SeoService) {
    this.seo.removeJsonLd('ld-organization');
    this.seo.removeJsonLd('ld-faq');
    effect(() => {
      const dict = this.translate.dict().seo;
      this.seo.update({
        title: dict.notFoundTitle,
        description: dict.notFoundDescription,
        noindex: true,
        locale: dict.ogLocale,
      });
    });
  }
}
