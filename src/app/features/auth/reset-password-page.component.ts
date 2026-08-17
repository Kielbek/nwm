import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';
import { classifyAuthError } from '../../core/utils/auth-error.util';

const MIN_PASSWORD_LENGTH = 10;

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, AuthLayoutComponent],
  templateUrl: './reset-password-page.component.html',
})
export class ResetPasswordPageComponent {
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly isDone = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private token = '';
  readonly hasToken = signal(false);

  constructor(
    private readonly auth: AuthService,
    route: ActivatedRoute,
    readonly translate: TranslateService,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().resetPasswordPage.title));
    route.queryParamMap.subscribe((params) => {
      this.token = params.get('token') ?? '';
      this.hasToken.set(!!this.token);
    });
  }

  submit(): void {
    const dict = this.translate.dict().resetPasswordPage;

    if (this.newPassword().length < MIN_PASSWORD_LENGTH) {
      this.errorMessage.set(dict.errorPasswordTooShort);
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.errorMessage.set(dict.errorPasswordMismatch);
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.auth.resetPassword(this.token, this.newPassword()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isDone.set(true);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.describeError(error));
      },
    });
  }

  private describeError(error: unknown): string {
    const dict = this.translate.dict().resetPasswordPage;
    return classifyAuthError(error) === 'invalid-or-expired-token'
      ? dict.errorInvalidToken
      : dict.errorUnknown;
  }
}
