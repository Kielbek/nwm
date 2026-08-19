import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TranslateService } from '../../../core/services/translate.service';

/** Shared two-panel shell for every auth page (login/register/forgot-password/etc). */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {
  @Input() tagline = '';

  /** Purely decorative animated wave bars in the brand panel's mock card — count only, no data. */
  readonly mockBars = Array.from({ length: 14 });

  constructor(readonly translate: TranslateService) {}
}
