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
import { downloadEntry } from '../../../core/utils/download-entry';

const AVG_CHARS_PER_SECOND = 14;
const SKIP_SECONDS = 10;
const TICK_MS = 200;
const SHARE_FEEDBACK_MS = 2000;

interface PendingSeek {
  index: number;
  seconds: number;
}

/**
 * Plays a generation's real synthesized audio, chunk by chunk, as an
 * ordered queue of `<audio>` elements — not a template-bound one, created
 * in code so it can be swapped out as playback advances. While a job is
 * still streaming in, this plays whatever chunks have arrived and pauses
 * (without stopping) at the end of the queue until GenerationHistoryService
 * appends the next one (see `ngOnChanges`'s "same generation" branch),
 * which is what makes long generations audible before they finish.
 */
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
  @Output() closeRequested = new EventEmitter<void>();

  readonly isPlaying = signal(false);
  readonly elapsed = signal(0);
  readonly duration = signal(1);
  readonly justCopied = signal(false);

  private audio: HTMLAudioElement | null = null;
  private currentChunkIndex: number | null = null;
  private pendingSeek: PendingSeek | null = null;
  private tickTimer?: ReturnType<typeof setInterval>;
  private copiedTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly translate: TranslateService,
    private readonly history: GenerationHistoryService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['entry'];
    if (!change) {
      return;
    }
    const isNewGeneration =
      change.firstChange || change.previousValue?.id !== change.currentValue?.id;

    if (isNewGeneration) {
      this.stopPlayback();
      this.audio = null;
      this.currentChunkIndex = null;
      this.pendingSeek = null;
      this.elapsed.set(0);
      this.duration.set(this.computeDuration());
      return;
    }

    this.duration.set(this.computeDuration());
    if (this.isPlaying() && !this.audio) {
      // We ran out of available audio and were waiting — a new chunk (or
      // the final combined result) may have just arrived.
      this.resume();
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

  hasPlayableAudio(): boolean {
    return this.entry.chunks.length > 0;
  }

  isGenerating(): boolean {
    return this.entry.status === 'PENDING' || this.entry.status === 'PROCESSING';
  }

  generationProgressPercent(): number {
    const total = this.entry.chunks[0]?.total ?? 0;
    if (!total) {
      return 0;
    }
    return Math.min(100, Math.round((this.entry.chunks.length / total) * 100));
  }

  generationProgressLabel(): string {
    const total = this.entry.chunks[0]?.total;
    if (!total) {
      return this.translate.dict().player.connecting;
    }
    return `${this.translate.dict().player.generating} — ${this.entry.chunks.length}/${total}`;
  }

  close(): void {
    this.stopPlayback();
    this.closeRequested.emit();
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  skip(delta: number): void {
    if (!this.hasPlayableAudio()) {
      return;
    }
    const target = Math.min(this.duration(), Math.max(0, this.elapsed() + delta));
    const { index, offset } = this.locateChunkFor(target);
    this.elapsed.set(target);
    if (this.isPlaying()) {
      this.playChunkAtIndex(index, offset);
    } else {
      this.currentChunkIndex = index;
      this.pendingSeek = { index, seconds: offset };
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
    downloadEntry(this.entry);
  }

  private resume(): void {
    if (!this.hasPlayableAudio()) {
      return;
    }
    this.isPlaying.set(true);

    if (this.pendingSeek) {
      const { index, seconds } = this.pendingSeek;
      this.pendingSeek = null;
      this.playChunkAtIndex(index, seconds);
      return;
    }
    if (this.audio) {
      this.audio.play().catch(() => {});
      this.startTicking();
      return;
    }
    if (this.currentChunkIndex !== null) {
      this.advanceToNextChunk();
      return;
    }
    this.playChunkAtIndex(0);
  }

  private pause(): void {
    this.isPlaying.set(false);
    this.stopTicking();
    this.audio?.pause();
  }

  private playChunkAtIndex(index: number, seekSeconds = 0): void {
    const chunk = this.entry.chunks.find((c) => c.index === index);
    if (!chunk) {
      // Not synthesized yet — ngOnChanges resumes automatically once it is.
      this.currentChunkIndex = index;
      this.audio = null;
      this.stopTicking();
      return;
    }

    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
    }

    const audio = new Audio(chunk.url);
    audio.playbackRate = this.entry.settings.speed || 1;
    if (seekSeconds > 0) {
      audio.currentTime = seekSeconds;
    }
    audio.onended = () => this.advanceToNextChunk();
    audio.onerror = () => this.handleEnded();

    this.audio = audio;
    this.currentChunkIndex = index;
    audio.play().catch(() => {});
    this.startTicking();
  }

  private advanceToNextChunk(): void {
    const nextIndex = (this.currentChunkIndex ?? 0) + 1;
    const nextChunk = this.entry.chunks.find((c) => c.index === nextIndex);
    if (nextChunk) {
      this.playChunkAtIndex(nextIndex);
      return;
    }

    const stillGenerating = this.entry.status === 'PENDING' || this.entry.status === 'PROCESSING';
    if (stillGenerating) {
      // Pause here — ngOnChanges resumes once the next chunk lands.
      this.currentChunkIndex = nextIndex - 1;
      this.audio = null;
      this.stopTicking();
      return;
    }
    this.handleEnded();
  }

  private handleEnded(): void {
    this.elapsed.set(this.duration());
    this.isPlaying.set(false);
    this.stopTicking();
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickTimer = setInterval(() => {
      if (this.audio) {
        this.elapsed.set(this.elapsedBeforeCurrentChunk() + this.audio.currentTime);
      }
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
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
    }
  }

  private elapsedBeforeCurrentChunk(): number {
    if (this.currentChunkIndex === null) {
      return 0;
    }
    let sum = 0;
    for (const chunk of this.entry.chunks) {
      if (chunk.index < this.currentChunkIndex) {
        sum += chunk.durationSeconds ?? 0;
      }
    }
    return sum;
  }

  private locateChunkFor(targetSeconds: number): { index: number; offset: number } {
    const chunks = this.entry.chunks;
    if (!chunks.length) {
      return { index: 0, offset: 0 };
    }
    let remaining = targetSeconds;
    for (const chunk of chunks) {
      const chunkDuration = chunk.durationSeconds ?? 0;
      const isLast = chunk.index === chunks[chunks.length - 1].index;
      if (remaining < chunkDuration || isLast) {
        return { index: chunk.index, offset: Math.max(0, remaining) };
      }
      remaining -= chunkDuration;
    }
    return { index: chunks[chunks.length - 1].index, offset: 0 };
  }

  private computeDuration(): number {
    if (this.entry.durationSeconds != null) {
      return this.entry.durationSeconds;
    }
    const sum = this.entry.chunks.reduce((acc, chunk) => acc + (chunk.durationSeconds ?? 0), 0);
    return sum > 0 ? sum : this.estimateDuration();
  }

  private estimateDuration(): number {
    const speed = this.entry.settings.speed || 1;
    return Math.max(1, this.entry.text.length / (AVG_CHARS_PER_SECOND * speed));
  }
}
