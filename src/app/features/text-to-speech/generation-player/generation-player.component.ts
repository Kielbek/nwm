import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import {
  GenerationEntry,
  GenerationHistoryService,
} from '../../../core/services/generation-history.service';
import { TranslateService } from '../../../core/services/translate.service';
import { formatRelativeTime } from '../../../core/utils/relative-time';

const AVG_CHARS_PER_SECOND = 14;
const SKIP_SECONDS = 10;
const TICK_MS = 200;
const SHARE_FEEDBACK_MS = 2000;

@Component({
  selector: 'app-generation-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './generation-player.component.html',
  styleUrl: './generation-player.component.scss',
})
export class GenerationPlayerComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) entry!: GenerationEntry;
  @Output() regenerate = new EventEmitter<void>();

  readonly isPlaying = signal(false);
  readonly elapsed = signal(0);
  readonly duration = signal(1);
  readonly justCopied = signal(false);

  private tickTimer?: ReturnType<typeof setInterval>;
  private copiedTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly translate: TranslateService,
    private readonly history: GenerationHistoryService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['entry'];
    const isNewGeneration =
      change && (change.firstChange || change.previousValue?.id !== change.currentValue?.id);
    if (isNewGeneration) {
      this.stopPlayback();
      this.duration.set(this.estimateDuration());
      this.elapsed.set(0);
    }
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    clearTimeout(this.copiedTimeout);
  }

  relativeTime(): string {
    return formatRelativeTime(this.entry.createdAt, this.translate.dict().historyPage);
  }

  formatTime(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  skip(delta: number): void {
    const next = Math.min(this.duration(), Math.max(0, this.elapsed() + delta));
    this.elapsed.set(next);
    if (this.isPlaying()) {
      this.speak(next);
    }
  }

  setFeedback(feedback: 'up' | 'down'): void {
    this.history.setFeedback(this.entry.id, this.entry.feedback === feedback ? null : feedback);
  }

  share(): void {
    const shareData = { title: this.entry.voiceName, text: this.entry.text };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(this.entry.text).then(() => {
      this.justCopied.set(true);
      clearTimeout(this.copiedTimeout);
      this.copiedTimeout = setTimeout(() => this.justCopied.set(false), SHARE_FEEDBACK_MS);
    });
  }

  download(): void {
    const lines = [
      `${this.entry.voiceName} — ${this.entry.modelName}`,
      new Date(this.entry.createdAt).toLocaleString(),
      '',
      this.entry.text,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.entry.voiceName.toLowerCase()}-${this.entry.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private resume(): void {
    this.isPlaying.set(true);
    this.speak(this.elapsed());
    this.startTicking();
  }

  private pause(): void {
    this.isPlaying.set(false);
    this.stopTicking();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private speak(fromSeconds: number): void {
    if (!('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const text = this.entry.text;
    const offset = Math.round((fromSeconds / this.duration()) * text.length);
    const remaining = text.slice(offset).trim();
    if (!remaining) {
      this.handleEnded();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(remaining);
    utterance.lang = this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US';
    utterance.rate = this.entry.settings.speed;
    utterance.onend = () => this.handleEnded();
    window.speechSynthesis.speak(utterance);
  }

  private handleEnded(): void {
    this.elapsed.set(this.duration());
    this.isPlaying.set(false);
    this.stopTicking();
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickTimer = setInterval(() => {
      const next = this.elapsed() + TICK_MS / 1000;
      if (next >= this.duration()) {
        this.handleEnded();
        return;
      }
      this.elapsed.set(next);
    }, TICK_MS);
  }

  private stopTicking(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
  }

  private stopPlayback(): void {
    this.isPlaying.set(false);
    this.stopTicking();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private estimateDuration(): number {
    const speed = this.entry.settings.speed || 1;
    return Math.max(1, this.entry.text.length / (AVG_CHARS_PER_SECOND * speed));
  }
}
