import { Injectable, signal } from '@angular/core';

/** Desktop-only login popup, triggered from public nav CTAs (mobile redirects to /login instead). */
@Injectable({ providedIn: 'root' })
export class LoginModalService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
