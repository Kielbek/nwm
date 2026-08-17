import { Injectable, signal } from '@angular/core';

/**
 * Opened when the user hits their character quota (e.g. tries to generate
 * with too few characters remaining) so they can upgrade without losing
 * their place in the editor.
 */
@Injectable({ providedIn: 'root' })
export class UpgradeModalService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
