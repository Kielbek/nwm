import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

type VerifyState = 'checking' | 'success' | 'missing-token' | 'error';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, AuthLayoutComponent],
  templateUrl: './verify-email-page.component.html',
})
export class VerifyEmailPageComponent {
  readonly state = signal<VerifyState>('checking');

  constructor(
    private readonly auth: AuthService,
    route: ActivatedRoute,
    readonly translate: TranslateService,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().verifyEmailPage.title));

    const token = route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('missing-token');
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: () => this.state.set('success'),
      error: () => this.state.set('error'),
    });
  }
}
