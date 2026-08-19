import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ChatService } from '../../core/services/chat.service';
import { TranslateService } from '../../core/services/translate.service';

// Minimal shape for the browser's (still vendor-prefixed) SpeechRecognition
// API — there's no official TS lib for it, and only the handful of members
// the mic button actually uses are declared here.
interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

@Component({
  selector: 'app-ask-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  templateUrl: './ask-panel.component.html',
  styleUrl: './ask-panel.component.scss',
})
export class AskPanelComponent implements AfterViewChecked, OnDestroy {
  @Input() open = false;
  @Input() overlay = false;
  @Output() closeRequested = new EventEmitter<void>();

  @ViewChild('body') bodyRef?: ElementRef<HTMLElement>;
  @ViewChild('textarea') textareaRef?: ElementRef<HTMLTextAreaElement>;

  readonly draft = signal('');
  readonly copiedMessageId = signal<string | null>(null);
  readonly expanded = signal(false);
  readonly listening = signal(false);
  readonly promptsOpen = signal(false);
  readonly micSupported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  private lastScrolledCount = 0;
  private copiedTimeout?: ReturnType<typeof setTimeout>;
  private recognition?: SpeechRecognitionLike;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    readonly chat: ChatService,
    readonly translate: TranslateService
  ) {}

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  togglePrompts(): void {
    this.promptsOpen.update((v) => !v);
  }

  pickPrompt(text: string): void {
    this.promptsOpen.set(false);
    this.sendSuggestion(text);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.promptsOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.promptsOpen.set(false);
    }
  }

  toggleMic(): void {
    if (!this.micSupported) {
      return;
    }
    if (this.listening()) {
      this.recognition?.stop();
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      return;
    }
    const recognition = new Ctor() as SpeechRecognitionLike;
    recognition.lang = this.translate.lang() === 'pl' ? 'pl-PL' : 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        this.draft.set(`${this.draft()}${this.draft() ? ' ' : ''}${transcript}`);
      }
    };
    recognition.onend = () => this.listening.set(false);
    recognition.onerror = () => this.listening.set(false);
    this.recognition = recognition;
    this.listening.set(true);
    recognition.start();
  }

  ngOnDestroy(): void {
    this.recognition?.stop();
    clearTimeout(this.copiedTimeout);
  }

  submit(): void {
    const text = this.draft();
    if (!text.trim() || this.chat.isSending()) {
      return;
    }
    this.chat.send(text);
    this.draft.set('');
    if (this.textareaRef) {
      this.textareaRef.nativeElement.style.height = 'auto';
    }
  }

  autoResize(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  copyMessage(message: { id: string; text: string }): void {
    navigator.clipboard?.writeText(message.text).then(() => {
      this.copiedMessageId.set(message.id);
      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }
      this.copiedTimeout = setTimeout(() => this.copiedMessageId.set(null), 1500);
    });
  }

  sendSuggestion(text: string): void {
    if (this.chat.isSending()) {
      return;
    }
    this.chat.send(text);
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.submit();
    }
  }

  ngAfterViewChecked(): void {
    const count = this.chat.messages().length + (this.chat.isSending() ? 1 : 0);
    if (count !== this.lastScrolledCount && this.bodyRef) {
      this.lastScrolledCount = count;
      const el = this.bodyRef.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
