import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JobChunk, JobResponse, JobStatus, OutputFormat, TtsSettings } from '../models/tts.models';
import { TranslateService } from './translate.service';
import { VoiceLibraryService } from './voice-library.service';

export type GenerationFeedback = 'up' | 'down' | null;

const MODEL_IDS = ['expressive', 'standard', 'fast', 'draft'];

export interface GenerationEntry {
  id: string; // the backend's GenerationJob id — real audio lives at /api/tts/jobs/{id}
  text: string;
  voiceId: string;
  voiceName: string;
  voiceDescription: string;
  modelId: string;
  modelName: string;
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
  modelName: string;
  outputFormat: OutputFormat;
  settings: TtsSettings;
}

const MAX_ENTRIES = 50;

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
 */
@Injectable({ providedIn: 'root' })
export class GenerationHistoryService {
  readonly entries = signal<GenerationEntry[]>([]);
  readonly pendingReuse = signal<PendingReuse | null>(null);
  readonly pendingPlaybackId = signal<string | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly translate: TranslateService,
    private readonly voiceLibrary: VoiceLibraryService
  ) {
    this.loadFromServer();
  }

  loadFromServer(): void {
    this.http
      .get<{ content: JobResponse[] }>('/api/tts/history', { params: { size: String(MAX_ENTRIES) } })
      .subscribe({
        next: (page) => this.entries.set(page.content.map((job) => this.fromJobResponse(job))),
        error: () => {
          // Not logged in yet, or the backend is briefly unreachable — the
          // list just stays empty rather than breaking the page.
        },
      });
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
      modelName: input.modelName,
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
    this.entries.set([entry, ...this.entries()].slice(0, MAX_ENTRIES));
    return entry;
  }

  /** Called by TtsService as each SSE "chunk" event arrives for a job. */
  applyChunk(jobId: string, chunk: JobChunk): void {
    this.updateEntry(jobId, (entry) => {
      if (entry.chunks.some((c) => c.index === chunk.index)) {
        return entry;
      }
      const chunks = [...entry.chunks, chunk].sort((a, b) => a.index - b.index);
      return { ...entry, chunks, status: entry.status === 'PENDING' ? 'PROCESSING' : entry.status };
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
  }

  setFeedback(id: string, feedback: GenerationFeedback): void {
    this.updateEntry(id, (entry) => ({
      ...entry,
      feedback: entry.feedback === feedback ? null : feedback,
    }));
  }

  remove(id: string): void {
    this.entries.set(this.entries().filter((entry) => entry.id !== id));
  }

  clear(): void {
    this.entries.set([]);
  }

  /** Loads the entry's text + voice back into the editor for a fresh generation. */
  reuse(entry: GenerationEntry): void {
    this.pendingReuse.set({ text: entry.text, voiceId: entry.voiceId });
  }

  /** Opens the entry's already-generated audio in the player — no re-synthesis. */
  replay(entry: GenerationEntry): void {
    this.pendingPlaybackId.set(entry.id);
  }

  consumePendingReuse(): PendingReuse | null {
    const pending = this.pendingReuse();
    if (pending) {
      this.pendingReuse.set(null);
    }
    return pending;
  }

  consumePendingPlaybackId(): string | null {
    const id = this.pendingPlaybackId();
    if (id) {
      this.pendingPlaybackId.set(null);
    }
    return id;
  }

  private updateEntry(id: string, update: (entry: GenerationEntry) => GenerationEntry): void {
    const next = this.entries().map((entry) => (entry.id === id ? update(entry) : entry));
    this.entries.set(next);
  }

  private fromJobResponse(job: JobResponse): GenerationEntry {
    const voice = this.voiceLibrary.voices().find((v) => v.id === job.voiceId);
    const modelIndex = MODEL_IDS.indexOf(job.modelId);
    const modelMeta = modelIndex >= 0 ? this.translate.dict().models[modelIndex] : null;
    return {
      id: job.id,
      text: job.text,
      voiceId: job.voiceId,
      voiceName: voice?.name ?? job.voiceId,
      voiceDescription: voice?.description ?? '',
      modelId: job.modelId,
      modelName: modelMeta?.name ?? job.modelId,
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
