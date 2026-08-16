import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';

interface PanelPosition {
  top: number;
  left: number;
  width: number;
}

/**
 * Generic trigger + panel dropdown. Project the trigger with
 * [dropdownTrigger] and the panel content with [dropdownPanel].
 *
 * The panel is positioned with `position: fixed` and coordinates computed
 * from the trigger's bounding rect, so it always escapes any scrollable
 * ancestor (e.g. the settings sidebar) instead of getting clipped. On
 * narrow viewports it becomes a bottom sheet (see dropdown.component.scss).
 */
@Component({
  selector: 'app-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dropdown">
      <div #trigger class="dropdown__trigger" (click)="toggle()">
        <ng-content select="[dropdownTrigger]"></ng-content>
      </div>
      @if (isOpen()) {
        <div class="dropdown__backdrop" (click)="close()"></div>
        <div
          class="dropdown__panel"
          [style.top.px]="position().top"
          [style.left.px]="position().left"
          [style.width.px]="position().width"
        >
          <ng-content select="[dropdownPanel]"></ng-content>
        </div>
      }
    </div>
  `,
  styleUrl: './dropdown.component.scss',
})
export class DropdownComponent implements OnDestroy {
  @ViewChild('trigger', { static: true }) triggerRef!: ElementRef<HTMLElement>;

  readonly isOpen = signal(false);
  readonly position = signal<PanelPosition>({ top: 0, left: 0, width: 0 });

  private readonly onScrollCapture = (): void => this.close();

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.isOpen() ? this.close() : this.open();
  }

  open(): void {
    this.updatePosition();
    this.isOpen.set(true);
    document.addEventListener('scroll', this.onScrollCapture, true);
  }

  close(): void {
    this.isOpen.set(false);
    document.removeEventListener('scroll', this.onScrollCapture, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScrollCapture, true);
  }

  private updatePosition(): void {
    const rect = this.triggerRef.nativeElement.getBoundingClientRect();
    this.position.set({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isOpen()) {
      this.updatePosition();
    }
  }
}
