import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  signal,
} from '@angular/core';

/**
 * Generic trigger + panel dropdown. Project the trigger with
 * [dropdownTrigger] and the panel content with [dropdownPanel].
 */
@Component({
  selector: 'app-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dropdown">
      <div class="dropdown__trigger" (click)="toggle()">
        <ng-content select="[dropdownTrigger]"></ng-content>
      </div>
      @if (isOpen()) {
        <div class="dropdown__panel">
          <ng-content select="[dropdownPanel]"></ng-content>
        </div>
      }
    </div>
  `,
  styleUrl: './dropdown.component.scss',
})
export class DropdownComponent {
  readonly isOpen = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
