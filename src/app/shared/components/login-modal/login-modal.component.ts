import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { LoginFormComponent } from '../../../features/auth/login-form/login-form.component';
import { LoginModalService } from '../../../core/services/login-modal.service';
import { TranslateService } from '../../../core/services/translate.service';

/** Desktop popup shown when a signed-out visitor clicks "Open app" / "Try free" in the public nav. */
@Component({
  selector: 'app-login-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoginFormComponent],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.scss',
})
export class LoginModalComponent {
  constructor(readonly modal: LoginModalService, readonly translate: TranslateService) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.isOpen()) {
      this.modal.close();
    }
  }
}
