import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, first, map, of, switchMap, take, tap, throwError, timer } from 'rxjs';
import { JobChunk, JobResponse, SynthesizeRequest, SynthesizeResult } from '../models/tts.models';
import { TranslateService } from './translate.service';
import { AuthService } from './auth.service';
import { GenerationHistoryService, StartEntryInput } from './generation-history.service';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40; // ~60s before giving up and falling back

/**
 * Talks to the backend's async TTS pipeline: POST kicks off a RabbitMQ job
 * (202 + PENDING) and immediately registers it with GenerationHistoryService,
 * then this opens an SSE connection to GET /api/tts/jobs/{id}/stream so
 * chunks (and eventually the final "done" event) land in the history entry
 * as the worker produces them — the player picks those up live, playing
 * early chunks before the rest of a long text finishes generating. If the
 * stream can't be opened at all, falls back to the old REST-polling
 * approach so a flaky SSE connection doesn't break generation entirely.
 * Falls back to the browser's SpeechSynthesis API only if the backend is
 * unreachable outright.
 *
 * Native EventSource can't attach the Authorization header this API needs,
 * so the stream is read with `fetch` + a small manual SSE line-parser
 * instead (see `openStream`).
 */
@Injectable({ providedIn: 'root' })
export class TtsService {
  private readonly synthesizeUrl = '/api/tts/synthesize';
  private readonly jobsUrl = '/api/tts/jobs';

  readonly isSynthesizing = signal(false);
  readonly lastError = signal<string | null>(null);
  /** Set as soon as POST /synthesize resolves, so callers can jump straight to the live entry. */
  readonly lastStartedEntryId = signal<string | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly translate: TranslateService,
    private readonly auth: AuthService,
    private readonly history: GenerationHistoryService
  ) {}

  synthesize(request: SynthesizeRequest, meta: StartEntryInput): Observable<SynthesizeResult | null> {
    this.isSynthesizing.set(true);
    this.lastError.set(null);

    const body = {
      text: request.text,
      voiceId: request.settings.voiceId,
      modelId: request.settings.modelId,
      outputFormat: request.settings.outputFormat,
      settings: {
        speed: request.settings.speed,
        stability: request.settings.stability,
        similarity: request.settings.similarity,
        styleExaggeration: request.settings.styleExaggeration,
        languageOverride: request.settings.languageOverride,
      },
    };

    return this.http.post<JobResponse>(this.synthesizeUrl, body).pipe(
      tap((job) => {
        this.history.startEntry(job, meta);
        this.lastStartedEntryId.set(job.id);
      }),
      switchMap((job) => this.trackJob(job.id)),
      switchMap((job) =>
        job.status === 'FAILED'
          ? throwError(() => new Error(job.errorMessage ?? 'TTS job failed'))
          : of(job)
      ),
      map((job): SynthesizeResult => ({
        audioUrl: job.downloadUrl ?? '',
        durationSeconds: job.durationSeconds ?? 0,
      })),
      tap(() => this.isSynthesizing.set(false)),
      catchError(() => {
        this.isSynthesizing.set(false);
        this.speakWithBrowserFallback(request.text);
        return of(null);
      })
    );
  }

  /** Opens the job's SSE stream and resolves once it reaches a terminal status. */
  private trackJob(jobId: string): Observable<JobResponse> {
    const done = new Subject<JobResponse>();
    this.openStream(jobId, done);
    return done.asObservable();
  }

  private openStream(jobId: string, done: Subject<JobResponse>): void {
    const token = this.auth.getAccessToken();
    fetch(`${this.jobsUrl}/${jobId}/stream`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error(`Stream request failed with ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          let separatorIndex: number;
          while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);
            this.handleSseEvent(jobId, rawEvent, done);
          }
        }
      })
      .catch(() => {
        // SSE didn't work (network hiccup, proxy buffering, etc.) — the job
        // is still running server-side, so fall back to polling for it.
        this.pollUntilDone(jobId).subscribe({
          next: (job) => {
            this.history.applyJobUpdate(job);
            done.next(job);
            done.complete();
          },
          error: () => done.error(new Error('Failed to track TTS job')),
        });
      });
  }

  private handleSseEvent(jobId: string, rawEvent: string, done: Subject<JobResponse>): void {
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of rawEvent.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (!dataLines.length) {
      return;
    }
    const data = JSON.parse(dataLines.join('\n'));
    if (eventName === 'chunk') {
      this.history.applyChunk(jobId, data as JobChunk);
    } else if (eventName === 'done') {
      const job = data as JobResponse;
      this.history.applyJobUpdate(job);
      done.next(job);
      done.complete();
    }
  }

  private pollUntilDone(jobId: string): Observable<JobResponse> {
    return timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.http.get<JobResponse>(`${this.jobsUrl}/${jobId}`)),
      take(MAX_POLL_ATTEMPTS),
      // If the job never reaches a terminal status within MAX_POLL_ATTEMPTS,
      // `take` completes the source without emitting a match, so `first`
      // throws EmptyError — the outer catchError treats that as any other
      // failure and falls back to browser speech synthesis.
      first((job) => job.status === 'COMPLETED' || job.status === 'FAILED')
    );
  }

  private speakWithBrowserFallback(text: string): void {
    if (!('speechSynthesis' in window) || !text.trim()) {
      this.lastError.set(this.translate.dict().editor.errorNoSpeechEngine);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}
