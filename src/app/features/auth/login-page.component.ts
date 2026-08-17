import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';
import { classifyAuthError } from '../../core/utils/auth-error.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, AuthLayoutComponent],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private returnUrl = '/app';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    route: ActivatedRoute,
    readonly translate: TranslateService,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().loginPage.title));
    route.queryParamMap.subscribe((params) => {
      this.returnUrl = params.get('returnUrl') || '/app';
    });
  }

  submit(): void {
    const dict = this.translate.dict().loginPage;
    if (!this.email().trim() || !this.password()) {
      this.errorMessage.set(dict.errorRequired);
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.auth.login({ email: this.email().trim(), password: this.password() }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.describeError(error));
      },
    });
  }

  signInWithGoogle(): void {
    window.location.href = this.auth.googleLoginUrl();
  }

  private describeError(error: unknown): string {
    const dict = this.translate.dict().loginPage;
    switch (classifyAuthError(error)) {
      case 'invalid-credentials':
        return dict.errorInvalidCredentials;
      case 'locked':
        return dict.errorLocked;
      case 'rate-limited':
        return dict.errorRateLimited;
      default:
        return dict.errorUnknown;
    }
  }
}
