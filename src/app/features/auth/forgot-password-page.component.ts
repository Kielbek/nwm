import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, AuthLayoutComponent],
  templateUrl: './forgot-password-page.component.html',
})
export class ForgotPasswordPageComponent {
  readonly email = signal('');
  readonly isSubmitting = signal(false);
  readonly isSent = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(private readonly auth: AuthService, readonly translate: TranslateService, seo: SeoService) {
    effect(() => seo.setPrivateTitle(this.translate.dict().forgotPasswordPage.title));
  }

  submit(): void {
    const dict = this.translate.dict().forgotPasswordPage;
    if (!this.email().trim()) {
      this.errorMessage.set(dict.errorRequired);
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    // The backend always returns 200 here regardless of whether the email is
    // registered (no account enumeration) — so success is the only outcome
    // we branch on; a network/server error still surfaces as an error.
    this.auth.forgotPassword(this.email().trim()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSent.set(true);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set(dict.errorUnknown);
      },
    });
  }
}
