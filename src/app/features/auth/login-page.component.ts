import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthLayoutComponent, LoginFormComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  returnUrl = '/app';

  constructor(route: ActivatedRoute, readonly translate: TranslateService, seo: SeoService) {
    effect(() => seo.setPrivateTitle(this.translate.dict().loginPage.title));
    route.queryParamMap.subscribe((params) => {
      this.returnUrl = params.get('returnUrl') || '/app';
    });
  }
}
