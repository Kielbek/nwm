import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Shared chrome (backdrop, panel, close button, escape-to-close, entry
 * animation) for every modal in the app — previously each modal
 * (login/invite/upgrade/history-detail/file-manager) duplicated this same
 * boilerplate with slowly drifting styles. Each modal now just supplies its
 * own inner content via projection and a few layout inputs.
 */
@Component({
  selector: 'app-modal-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './modal-shell.component.html',
  styleUrl: './modal-shell.component.scss',
})
export class ModalShellComponent {
  @Input() isOpen = false;
  /** Panel max-width in px. */
  @Input() maxWidth = 480;
  /** CSS `padding` shorthand for the panel; pass '0' when the content manages its own (e.g. a card, or a header/body split). */
  @Input() padding = '26px 24px 22px';
  /** Centers content and text — used by icon+message modals (login, invite, upgrade); block-layout modals (history detail, file manager) leave this off. */
  @Input() centered = false;
  /** 'hidden' lets the content manage its own internal scroll region instead of the whole panel scrolling. */
  @Input() overflow: 'auto' | 'hidden' = 'auto';
  @Input() showClose = true;
  @Input() closeLabel = '';
  /** Set false when the modal has its own multi-step escape behavior (e.g. cancel an in-progress rename before closing) — it should own document:keydown.escape entirely instead of racing this handler. */
  @Input() handleEscape = true;

  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen && this.handleEscape) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
