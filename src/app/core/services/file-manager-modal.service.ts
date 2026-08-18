import { Injectable, signal } from '@angular/core';

/** Open/closed state for the folder-organized file manager popup (replaces the old /app/history page as the header's entry point). */
@Injectable({ providedIn: 'root' })
export class FileManagerModalService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
