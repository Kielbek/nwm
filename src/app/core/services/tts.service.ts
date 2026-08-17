import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, first, map, of, switchMap, take, tap, throwError, timer } from 'rxjs';
import { JobResponse, SynthesizeRequest, SynthesizeResult } from '../models/tts.models';
import { TranslateService } from './translate.service';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40; // ~60s before giving up and falling back

/**
 * Talks to the backend's async TTS pipeline: POST kicks off a RabbitMQ job
 * (202 + PENDING), the worker processes it out of band, and we poll
 * GET /api/tts/jobs/{id} until it lands on COMPLETED/FAILED. Falls back to
 * the browser's SpeechSynthesis API on any failure (backend unreachable,
 * job failed, or polling timed out) so the UI stays demoable either way.
 */
@Injectable({ providedIn: 'root' })
export class TtsService {
  private readonly synthesizeUrl = '/api/tts/synthesize';
  private readonly jobsUrl = '/api/tts/jobs';

  readonly isSynthesizing = signal(false);
  readonly lastError = signal<string | null>(null);

  constructor(private readonly http: HttpClient, private readonly translate: TranslateService) {}

  synthesize(request: SynthesizeRequest): Observable<SynthesizeResult | null> {
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
      switchMap((job) => this.pollUntilDone(job.id)),
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
