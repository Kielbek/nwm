import { Injectable, computed, effect, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JobChunk, JobResponse, JobStatus, OutputFormat, TtsSettings } from '../models/tts.models';
import { AuthService } from './auth.service';
import { VoiceLibraryService } from './voice-library.service';
import { generationProgressPercent, isGenerating } from '../utils/generation-progress';

export type GenerationFeedback = 'up' | 'down' | null;

export interface GenerationEntry {
  id: string; // the backend's GenerationJob id — real audio lives at /api/tts/jobs/{id}
  text: string;
  voiceId: string;
  voiceName: string;
  voiceDescription: string;
  modelId: string;
  outputFormat: OutputFormat;
  settings: TtsSettings;
  createdAt: string;
  feedback: GenerationFeedback;
  status: JobStatus;
  chunks: JobChunk[];
  durationSeconds: number | null;
  downloadUrl: string | null;
  errorMessage: string | null;
}

export interface PendingReuse {
  text: string;
  voiceId: string;
}

export interface StartEntryInput {
  text: string;
  voiceId: string;
  voiceName: string;
  voiceDescription: string;
  modelId: string;
  outputFormat: OutputFormat;
  settings: TtsSettings;
}

interface HistoryPage {
  content: JobResponse[];
  last: boolean;
}

const PAGE_SIZE = 20;
// A generous ceiling so a very long session can't accumulate unbounded
// entries in memory — real pagination (loadMore) is what actually lets you
// reach older history beyond this, one page at a time.
const MAX_LOADED_ENTRIES = 500;
// While waiting for the very first chunk (total step count still unknown —
// the whole wait, for a single-chunk job), the progress bar eases toward
// this cap instead of sitting at a static 0%; real data always overrides it
// the instant it arrives. Decay controls how quickly it approaches the cap.
const CONNECTING_CREEP_CAP = 92;
const CONNECTING_CREEP_DECAY_MS = 3500;

/**
 * Tracks generations backed by the real GenerationJob rows on the server
 * (GET /api/tts/history) instead of localStorage — audio is real and
 * persisted in S3, so "replay" plays back the saved file/chunks instead of
 * re-running synthesis. Feedback (thumb up/down) has no backend column yet
 * and stays client-only, same as `remove`/`clear` which only affect what's
 * displayed here (there's no delete endpoint on the server).
 *
 * `startEntry`/`applyChunk`/`applyJobUpdate` are called by TtsService as a
 * generation progresses, so the sidebar/history list and the player update
 * live while a job is still streaming in.
 *
 * `activeEntryId` is the single source of truth for which entry the
 * persistent player (mounted once in AppShellComponent) shows — starting a
 * new generation or calling `replay()` on a history entry both just point
 * this at a different id, no navigation required, since the player is
 * visible on every /app/* page.
 */
@Injectable({ providedIn: 'root' })
export class GenerationHistoryService {
  readonly entries = signal<GenerationEntry[]>([]);
  readonly pendingReuse = signal<PendingReuse | null>(null);
  readonly activeEntryId = signal<string | null>(null);
  readonly activeEntry = computed(
    () => this.entries().find((entry) => entry.id === this.activeEntryId()) ?? null
  );
  // Whether the active entry should be playing right now — the single
  // source of truth for play/pause state, so any UI that shows a
  // play/pause control for the active entry (the persistent player, a
  // sidebar/history row, ...) stays in sync with all the others. The
  // actual <audio> engine still lives in GenerationPlayerComponent (it's
  // mounted once, app-shell-wide); it reacts to this signal rather than
  // owning play/pause state itself.
  readonly isPlaying = signal(false);

  /** True while a page (initial load or loadMore()) is in flight — drives loading skeletons. */
  readonly loadingMore = signal(false);
  /** False once the last page from the server has been loaded. */
  readonly hasMore = signal(true);
  private nextPage = 0;

  // --- Smoothed progress ------------------------------------------------
  // Real progress only advances in discrete jumps (one step per finished
  // chunk), which reads as "stuck, then a sudden jump" for multi-chunk
  // generations. To make it feel alive without lying about completion, we
  // track when each real milestone landed and — while waiting for the next
  // one — extrapolate a fake-but-honest position between them, paced by how
  // long the *previous* step actually took. `clockTick` is bumped on an
  // interval purely so `smoothedProgressPercent` (read from a template) is
  // re-evaluated between real data changes.
  private readonly progressTimelines = new Map<string, { percent: number; atMs: number }[]>();
  private readonly clockTick = signal(0);
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  // This service is a root singleton, so it outlives any single login
  // session — without this, switching accounts in the same tab (logout,
  // then log in as someone else) left the previous account's history
  // sitting in `entries` since nothing ever re-fetched or cleared it.
  // `undefined` means "not initialized yet"; comparing against it makes
  // the very first real user (or anonymous state) also count as a change.
  private lastUserId: string | null | undefined = undefined;

  constructor(
    private readonly http: HttpClient,
    private readonly voiceLibrary: VoiceLibraryService,
    private readonly auth: AuthService
  ) {
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      if (userId === this.lastUserId) {
        return;
      }
      this.lastUserId = userId;
      this.resetForAccountChange(userId !== null);
    }, { allowSignalWrites: true });
  }

  /** Drops everything belonging to whoever was previously signed in, then reloads for the new one (if any). */
  private resetForAccountChange(isAuthenticated: boolean): void {
    this.entries.set([]);
    this.activeEntryId.set(null);
    this.isPlaying.set(false);
    this.pendingReuse.set(null);
    this.progressTimelines.clear();
    this.stopTickingIfIdle();
    if (isAuthenticated) {
      this.loadFromServer();
    } else {
      this.nextPage = 0;
      this.hasMore.set(true);
    }
  }

  /** Resets to the first page — e.g. after login, when the previous list (if any) is stale. */
  loadFromServer(): void {
    this.nextPage = 0;
    this.hasMore.set(true);
    this.fetchPage(false);
  }

  /** Appends the next page of older history — no-ops while already loading or once exhausted. */
  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }
    this.fetchPage(true);
  }

  private fetchPage(append: boolean): void {
    this.loadingMore.set(true);
    this.http
      .get<HistoryPage>('/api/tts/history', {
        params: { page: String(this.nextPage), size: String(PAGE_SIZE) },
      })
      .subscribe({
        next: (page) => {
          const mapped = page.content.map((job) => this.fromJobResponse(job));
          const next = append ? [...this.entries(), ...mapped] : mapped;
          this.entries.set(next.slice(0, MAX_LOADED_ENTRIES));
          this.nextPage += 1;
          this.hasMore.set(!page.last && next.length < MAX_LOADED_ENTRIES);
          this.loadingMore.set(false);

          // A page can land mid-generation (e.g. a refresh) — seed a
          // starting milestone for those so smoothing has something to
          // extrapolate from once their next chunk lands.
          for (const entry of mapped) {
            if (isGenerating(entry.status) && !this.progressTimelines.has(entry.id)) {
              const real = generationProgressPercent(entry.status, entry.chunks);
              this.progressTimelines.set(entry.id, []);
              this.recordMilestone(entry.id, real ?? 0);
            }
          }
        },
        error: () => {
          // Not logged in yet, a briefly unreachable backend, or the last
          // page failed to load — the list just stays as it was rather
          // than breaking the page. hasMore stays true so a later
          // loadMore() (e.g. user scrolls again) can retry.
          this.loadingMore.set(false);
        },
      });
  }

  /**
   * Real progress (chunks.length / total) for `entry`, smoothed so it eases
   * toward the next real milestone instead of sitting flat and then
   * jumping. Never reports a value the real data hasn't earned yet — it
   * only interpolates *up to* the last confirmed milestone plus a
   * projected step, capped below 100 until the job is actually done.
   */
  smoothedProgressPercent(entry: GenerationEntry): number | null {
    const real = generationProgressPercent(entry.status, entry.chunks);
    if (real === null) {
      return null;
    }
    const timeline = this.progressTimelines.get(entry.id);
    if (!timeline || timeline.length === 0) {
      return real;
    }
    this.clockTick(); // subscribe so this recomputes on every tick

    if (timeline.length === 1) {
      // Still waiting on the very first chunk, so the total step count
      // (and therefore any real percentage) is unknown — including for
      // single-chunk jobs, where this is the *entire* wait. Ease a
      // fake-but-honest number up towards a cap instead of sitting at a
      // static 0 the whole time; real data takes over instantly once the
      // first chunk actually lands.
      const start = timeline[0];
      const elapsedMs = Date.now() - start.atMs;
      const creep =
        CONNECTING_CREEP_CAP * (1 - Math.exp(-elapsedMs / CONNECTING_CREEP_DECAY_MS));
      return Math.max(real, Math.round(creep));
    }

    const last = timeline[timeline.length - 1];
    if (last.percent >= 100) {
      // The only remaining chunk just landed — nothing left to project,
      // `real` already reflects it (status flips to done momentarily).
      return real;
    }

    // Pace the next step using how long the previous one actually took —
    // real chunk-synthesis time varies a lot, but "about as long as the
    // last chunk" is a much better guess than a fixed constant.
    const prev = timeline[timeline.length - 2];
    const stepDurationMs = Math.max(last.atMs - prev.atMs, 1);
    const stepSize = Math.max(last.percent - prev.percent, 0);
    const fraction = Math.min(1, (Date.now() - last.atMs) / stepDurationMs);
    const projected = last.percent + fraction * stepSize;
    // Capped below 100 so the bar never claims "done" before the real
    // status flips — actual completion always comes from `real`, not this.
    return Math.round(Math.min(projected, 99));
  }

  private recordMilestone(jobId: string, percent: number): void {
    const timeline = this.progressTimelines.get(jobId) ?? [];
    const lastPercent = timeline.length ? timeline[timeline.length - 1].percent : -1;
    if (percent === lastPercent) {
      return;
    }
    timeline.push({ percent, atMs: Date.now() });
    this.progressTimelines.set(jobId, timeline);
    this.ensureTicking();
  }

  private ensureTicking(): void {
    if (this.tickTimer) {
      return;
    }
    this.tickTimer = setInterval(() => this.clockTick.update((n) => n + 1), 300);
  }

  private stopTickingIfIdle(): void {
    const stillGenerating = this.entries().some((entry) => isGenerating(entry.status));
    if (!stillGenerating && this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /** Called right after POST /api/tts/synthesize returns its initial (PENDING) job. */
  startEntry(job: JobResponse, input: StartEntryInput): GenerationEntry {
    const entry: GenerationEntry = {
      id: job.id,
      text: input.text,
      voiceId: input.voiceId,
      voiceName: input.voiceName,
      voiceDescription: input.voiceDescription,
      modelId: input.modelId,
      outputFormat: input.outputFormat,
      settings: input.settings,
      createdAt: job.createdAt,
      feedback: null,
      status: job.status,
      chunks: [],
      durationSeconds: null,
      downloadUrl: null,
      errorMessage: null,
    };
    this.entries.set([entry, ...this.entries()].slice(0, MAX_LOADED_ENTRIES));
    this.activeEntryId.set(entry.id);
    this.progressTimelines.set(entry.id, []);
    this.recordMilestone(entry.id, 0);
    return entry;
  }

  /** Called by TtsService as each SSE "chunk" event arrives for a job. */
  applyChunk(jobId: string, chunk: JobChunk): void {
    this.updateEntry(jobId, (entry) => {
      if (entry.chunks.some((c) => c.index === chunk.index)) {
        return entry;
      }
      const chunks = [...entry.chunks, chunk].sort((a, b) => a.index - b.index);
      const status: JobStatus = entry.status === 'PENDING' ? 'PROCESSING' : entry.status;
      const real = generationProgressPercent(status, chunks);
      if (real !== null) {
        this.recordMilestone(jobId, real);
      }
      return { ...entry, chunks, status };
    });
  }

  /** Called by TtsService on the SSE "done" event (or a REST fallback poll) once the job finishes. */
  applyJobUpdate(job: JobResponse): void {
    this.updateEntry(job.id, (entry) => ({
      ...entry,
      status: job.status,
      chunks: job.chunks.length ? job.chunks : entry.chunks,
      durationSeconds: job.durationSeconds,
      downloadUrl: job.downloadUrl,
      errorMessage: job.errorMessage,
    }));
    if (!isGenerating(job.status)) {
      this.progressTimelines.delete(job.id);
      this.stopTickingIfIdle();
    }
  }

  setFeedback(id: string, feedback: GenerationFeedback): void {
    this.updateEntry(id, (entry) => ({
      ...entry,
      feedback: entry.feedback === feedback ? null : feedback,
    }));
  }

  remove(id: string): void {
    this.entries.set(this.entries().filter((entry) => entry.id !== id));
    if (this.activeEntryId() === id) {
      this.activeEntryId.set(null);
      this.isPlaying.set(false);
    }
    this.progressTimelines.delete(id);
    this.stopTickingIfIdle();
  }

  clear(): void {
    this.entries.set([]);
    this.activeEntryId.set(null);
    this.isPlaying.set(false);
    this.progressTimelines.clear();
    this.stopTickingIfIdle();
  }

  /** Loads the entry's text + voice back into the editor for a fresh generation. */
  reuse(entry: GenerationEntry): void {
    this.pendingReuse.set({ text: entry.text, voiceId: entry.voiceId });
  }

  /** Opens the entry's already-generated audio in the persistent player — no re-synthesis. */
  replay(entry: GenerationEntry): void {
    this.activeEntryId.set(entry.id);
  }

  /**
   * Play/pause control usable from anywhere an entry is listed (sidebar,
   * history page, ...) without needing a reference to the player itself.
   * Activating a different entry always starts it playing — pressing play
   * on a row is never a no-op; toggling only applies once that entry is
   * already the active one.
   */
  togglePlayback(entry: GenerationEntry): void {
    if (this.activeEntryId() === entry.id) {
      this.isPlaying.update((playing) => !playing);
    } else {
      this.activeEntryId.set(entry.id);
      this.isPlaying.set(true);
    }
  }

  consumePendingReuse(): PendingReuse | null {
    const pending = this.pendingReuse();
    if (pending) {
      this.pendingReuse.set(null);
    }
    return pending;
  }

  private updateEntry(id: string, update: (entry: GenerationEntry) => GenerationEntry): void {
    const next = this.entries().map((entry) => (entry.id === id ? update(entry) : entry));
    this.entries.set(next);
  }

  private fromJobResponse(job: JobResponse): GenerationEntry {
    const voice = this.voiceLibrary.voices().find((v) => v.id === job.voiceId);
    return {
      id: job.id,
      text: job.text,
      voiceId: job.voiceId,
      voiceName: voice?.name ?? job.voiceId,
      voiceDescription: voice?.description ?? '',
      modelId: job.modelId,
      outputFormat: job.outputFormat as OutputFormat,
      settings: {
        voiceId: job.voiceId,
        modelId: job.modelId,
        speed: 1,
        stability: 0.5,
        similarity: 0.85,
        styleExaggeration: 0,
        languageOverride: false,
        outputFormat: job.outputFormat as OutputFormat,
      },
      createdAt: job.createdAt,
      feedback: null,
      status: job.status,
      chunks: job.chunks,
      durationSeconds: job.durationSeconds,
      downloadUrl: job.downloadUrl,
      errorMessage: job.errorMessage,
    };
  }
}
