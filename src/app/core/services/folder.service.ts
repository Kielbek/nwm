import { Injectable, effect, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Folder } from '../models/folder.model';
import { AuthService } from './auth.service';

/**
 * The user's single-level folders for organizing generated audio — see the
 * file manager popup (shared/components/file-manager-modal). Loaded lazily
 * (on first `ensureLoaded()`, called when the popup opens) rather than
 * eagerly at app boot like GenerationHistoryService, since not every
 * session opens the file manager.
 */
@Injectable({ providedIn: 'root' })
export class FolderService {
  readonly folders = signal<Folder[]>([]);
  readonly loading = signal(false);
  private loaded = false;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {
    // Mirrors GenerationHistoryService's account-switch handling — this is
    // also a root singleton that outlives any single login session, so
    // switching accounts in the same tab needs to drop the previous
    // account's folders rather than leaving them sitting in `folders`.
    let lastUserId: string | null | undefined = undefined;
    effect(
      () => {
        const userId = this.auth.currentUser()?.id ?? null;
        if (userId === lastUserId) {
          return;
        }
        lastUserId = userId;
        this.folders.set([]);
        this.loaded = false;
      },
      { allowSignalWrites: true }
    );
  }

  ensureLoaded(): void {
    if (this.loaded || this.loading()) {
      return;
    }
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.http.get<Folder[]>('/api/folders').subscribe({
      next: (folders) => {
        this.folders.set(folders);
        this.loaded = true;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(name: string): Observable<Folder> {
    return this.http.post<Folder>('/api/folders', { name }).pipe(
      tap((folder) => {
        this.folders.update((list) => [...list, folder].sort((a, b) => a.name.localeCompare(b.name)));
      })
    );
  }

  rename(id: string, name: string): Observable<Folder> {
    return this.http.patch<Folder>(`/api/folders/${id}`, { name }).pipe(
      tap((updated) => {
        this.folders.update((list) =>
          list.map((f) => (f.id === id ? updated : f)).sort((a, b) => a.name.localeCompare(b.name))
        );
      })
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/folders/${id}`).pipe(
      tap(() => this.folders.update((list) => list.filter((f) => f.id !== id)))
    );
  }

  /** Adjusts a folder's displayed job count locally after moving a job in/out of it. */
  adjustCount(id: string, delta: number): void {
    this.folders.update((list) =>
      list.map((f) => (f.id === id ? { ...f, jobCount: Math.max(0, f.jobCount + delta) } : f))
    );
  }
}
