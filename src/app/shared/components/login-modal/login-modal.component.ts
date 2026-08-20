import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { LoginFormComponent } from '../../../features/auth/login-form/login-form.component';
import { LoginModalService } from '../../../core/services/login-modal.service';
import { TranslateService } from '../../../core/services/translate.service';

/** Desktop popup shown when a signed-out visitor clicks "Open app" / "Try free" in the public nav. */
@Component({
  selector: 'app-login-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Kept as a class (rather than just relying on the tag selector) so the
  // paper-token overrides below and the global ".login-modal .auth-form"
  // card-restoration rule in styles.scss keep working unchanged.
  host: { class: 'login-modal' },
  imports: [ModalShellComponent, LoginFormComponent],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.scss',
})
export class LoginModalComponent {
  constructor(readonly modal: LoginModalService, readonly translate: TranslateService) {}
}
