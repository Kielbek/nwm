import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { ReferralService } from '../../../core/services/referral.service';
import { TranslateService } from '../../../core/services/translate.service';

@Component({
  selector: 'app-invite-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ModalShellComponent],
  templateUrl: './invite-modal.component.html',
  styleUrl: './invite-modal.component.scss',
})
export class InviteModalComponent {
  readonly copied = signal(false);
  private copiedTimeout?: ReturnType<typeof setTimeout>;

  constructor(readonly referral: ReferralService, readonly translate: TranslateService) {}

  copyLink(): void {
    navigator.clipboard?.writeText(this.referral.referralLink()).then(() => {
      this.copied.set(true);
      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }
      this.copiedTimeout = setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
