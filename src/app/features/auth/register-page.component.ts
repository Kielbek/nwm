import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';
import { classifyAuthError } from '../../core/utils/auth-error.util';

const MIN_PASSWORD_LENGTH = 10;

@Component({
  selector: 'app-register-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, AuthLayoutComponent],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent {
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    readonly translate: TranslateService,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().registerPage.title));
  }

  submit(): void {
    const dict = this.translate.dict().registerPage;

    if (!this.name().trim() || !this.email().trim() || !this.password()) {
      this.errorMessage.set(dict.errorRequired);
      return;
    }
    if (this.password().length < MIN_PASSWORD_LENGTH) {
      this.errorMessage.set(dict.errorPasswordTooShort);
      return;
    }
    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set(dict.errorPasswordMismatch);
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.auth
      .register({ email: this.email().trim(), password: this.password(), name: this.name().trim() })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigateByUrl('/app');
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
    const dict = this.translate.dict().registerPage;
    switch (classifyAuthError(error)) {
      case 'account-exists':
        return dict.errorAccountExists;
      case 'validation':
        return dict.errorValidation;
      case 'rate-limited':
        return dict.errorRateLimited;
      default:
        return dict.errorUnknown;
    }
  }
}
