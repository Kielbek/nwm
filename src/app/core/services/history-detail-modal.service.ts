import { Injectable, signal } from '@angular/core';

/**
 * Holds which history entry (by id, not by value — see
 * HistoryDetailModalComponent, which looks it up live from
 * GenerationHistoryService.entries()) the detail modal is currently
 * showing, so it stays up to date if that entry is still streaming in.
 */
@Injectable({ providedIn: 'root' })
export class HistoryDetailModalService {
  readonly entryId = signal<string | null>(null);

  open(id: string): void {
    this.entryId.set(id);
  }

  close(): void {
    this.entryId.set(null);
  }
}
