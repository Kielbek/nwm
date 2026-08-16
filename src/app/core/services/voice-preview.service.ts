import { Injectable, signal } from '@angular/core';
import { TranslateService } from './translate.service';

export interface PreviewableVoice {
  id: string;
  previewPitch: number;
  previewRate: number;
}

/**
 * Plays a short sample line so a voice's pitch/pace can be previewed before
 * picking it. There's no real per-voice audio yet (no backend wired up), so
 * this uses the browser's SpeechSynthesis with a distinct pitch/rate per
 * voice as a stand-in — enough to tell voices apart by ear.
 */
@Injectable({ providedIn: 'root' })
export class VoicePreviewService {
  readonly playingVoiceId = signal<string | null>(null);

  constructor(private readonly translate: TranslateService) {}

  toggle(voice: PreviewableVoice): void {
    if (this.playingVoiceId() === voice.id) {
      this.stop();
      return;
    }
    this.play(voice);
  }

  stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.playingVoiceId.set(null);
  }

  private play(voice: PreviewableVoice): void {
    if (!('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();

    const isPolish = this.translate.lang() === 'pl';
    const utterance = new SpeechSynthesisUtterance(
      isPolish
        ? 'Cześć, tu przykładowy głos. Tak brzmię, czytając Twój tekst.'
        : 'Hi there, this is a voice sample. This is how I sound reading your text.'
    );
    utterance.lang = isPolish ? 'pl-PL' : 'en-US';
    utterance.pitch = voice.previewPitch;
    utterance.rate = voice.previewRate;
    utterance.onend = () => this.clearIfCurrent(voice.id);
    utterance.onerror = () => this.clearIfCurrent(voice.id);

    this.playingVoiceId.set(voice.id);
    window.speechSynthesis.speak(utterance);
  }

  private clearIfCurrent(voiceId: string): void {
    if (this.playingVoiceId() === voiceId) {
      this.playingVoiceId.set(null);
    }
  }
}
