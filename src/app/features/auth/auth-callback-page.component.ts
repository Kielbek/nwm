import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

type CallbackState = 'working' | 'error';

/**
 * Landing target for the Google OAuth redirect
 * (OAuth2LoginSuccessHandler/OAuth2LoginFailureHandler on the backend send
 * the browser here with either ?token=<accessToken> or ?error=... in the
 * query string — no code-exchange step happens client-side).
 */
@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, AuthLayoutComponent],
  templateUrl: './auth-callback-page.component.html',
})
export class AuthCallbackPageComponent {
  readonly state = signal<CallbackState>('working');

  constructor(
    private readonly auth: AuthService,
    route: ActivatedRoute,
    private readonly router: Router,
    readonly translate: TranslateService,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().authCallbackPage.title));

    const token = route.snapshot.queryParamMap.get('token');
    const error = route.snapshot.queryParamMap.get('error');

    if (error || !token) {
      this.state.set('error');
      return;
    }

    this.auth
      .applyOAuthToken(token)
      .then(() => this.router.navigateByUrl('/app'))
      .catch(() => this.state.set('error'));
  }
}
