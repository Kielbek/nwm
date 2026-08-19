import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateService } from '../../../core/services/translate.service';
import { classifyAuthError } from '../../../core/utils/auth-error.util';

/** Login form markup + submit logic, shared between the /login page and the desktop login modal. */
@Component({
  selector: 'app-login-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {
  @Input() returnUrl = '/app';
  @Output() success = new EventEmitter<void>();

  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    readonly translate: TranslateService
  ) {}

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
        this.success.emit();
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
