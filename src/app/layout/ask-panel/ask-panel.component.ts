import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ChatService } from '../../core/services/chat.service';
import { TranslateService } from '../../core/services/translate.service';

@Component({
  selector: 'app-ask-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  templateUrl: './ask-panel.component.html',
  styleUrl: './ask-panel.component.scss',
})
export class AskPanelComponent implements AfterViewChecked {
  @Input() open = false;
  @Input() overlay = false;
  @Output() closeRequested = new EventEmitter<void>();

  @ViewChild('body') bodyRef?: ElementRef<HTMLElement>;

  readonly draft = signal('');
  private lastScrolledCount = 0;

  constructor(readonly chat: ChatService, readonly translate: TranslateService) {}

  submit(): void {
    const text = this.draft();
    if (!text.trim() || this.chat.isSending()) {
      return;
    }
    this.chat.send(text);
    this.draft.set('');
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
