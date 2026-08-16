import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { SynthesizeRequest, SynthesizeResult } from '../models/tts.models';
import { TranslateService } from './translate.service';

/**
 * Talks to the backend TTS endpoint when configured. Falls back to the
 * browser's SpeechSynthesis API so the UI is demoable without a backend/API key.
 */
@Injectable({ providedIn: 'root' })
export class TtsService {
  private readonly apiUrl = '/api/tts/synthesize';

  readonly isSynthesizing = signal(false);
  readonly lastError = signal<string | null>(null);

  constructor(private readonly http: HttpClient, private readonly translate: TranslateService) {}

  synthesize(request: SynthesizeRequest): Observable<SynthesizeResult | null> {
    this.isSynthesizing.set(true);
    this.lastError.set(null);

    return this.http.post<SynthesizeResult>(this.apiUrl, request).pipe(
      tap(() => this.isSynthesizing.set(false)),
      catchError(() => {
        this.isSynthesizing.set(false);
        this.speakWithBrowserFallback(request.text);
        return of(null);
      })
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
