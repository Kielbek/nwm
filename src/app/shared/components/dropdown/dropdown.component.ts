import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';

interface PanelPosition {
  top: number;
  left: number | null;
  right: number | null;
  width: number | null;
}

const DRAG_CLOSE_THRESHOLD_PX = 110;

/**
 * Generic trigger + panel dropdown. Project the trigger with
 * [dropdownTrigger] and the panel content with [dropdownPanel].
 *
 * The panel is positioned with `position: fixed` and coordinates computed
 * from the trigger's bounding rect, so it always escapes any scrollable
 * ancestor (e.g. the settings sidebar) instead of getting clipped. On
 * narrow viewports it becomes a bottom sheet with a drag handle that can
 * be swiped down (mouse or touch, via Pointer Events) to dismiss it.
 *
 * `align="stretch"` (default) matches the panel width to the trigger, for
 * form-control style selects. `align="end"` sizes the panel to its content
 * and right-aligns it to the trigger, for compact icon-button menus.
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
          [class.dropdown__panel--dragging]="isDragging()"
          [style.top.px]="position().top"
          [style.left.px]="position().left"
          [style.right.px]="position().right"
          [style.width.px]="position().width"
          [style.transform]="'translateY(' + dragOffset() + 'px)'"
        >
          <div
            class="dropdown__handle"
            (pointerdown)="onDragStart($event)"
            (pointermove)="onDragMove($event)"
            (pointerup)="onDragEnd($event)"
            (pointercancel)="onDragEnd($event)"
          ></div>
          <ng-content select="[dropdownPanel]"></ng-content>
        </div>
      }
    </div>
  `,
  styleUrl: './dropdown.component.scss',
})
export class DropdownComponent implements OnDestroy {
  @Input() align: 'stretch' | 'end' = 'stretch';

  @ViewChild('trigger', { static: true }) triggerRef!: ElementRef<HTMLElement>;

  readonly isOpen = signal(false);
  readonly isDragging = signal(false);
  readonly dragOffset = signal(0);
  readonly position = signal<PanelPosition>({ top: 0, left: 0, right: null, width: 0 });

  private dragStartY = 0;
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
    this.isDragging.set(false);
    this.dragOffset.set(0);
    document.removeEventListener('scroll', this.onScrollCapture, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScrollCapture, true);
  }

  onDragStart(event: PointerEvent): void {
    this.isDragging.set(true);
    this.dragStartY = event.clientY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onDragMove(event: PointerEvent): void {
    if (!this.isDragging()) {
      return;
    }
    this.dragOffset.set(Math.max(0, event.clientY - this.dragStartY));
  }

  onDragEnd(event: PointerEvent): void {
    if (!this.isDragging()) {
      return;
    }
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.isDragging.set(false);
    const shouldClose = this.dragOffset() > DRAG_CLOSE_THRESHOLD_PX;
    this.dragOffset.set(0);
    if (shouldClose) {
      this.close();
    }
  }

  private updatePosition(): void {
    const rect = this.triggerRef.nativeElement.getBoundingClientRect();
    if (this.align === 'end') {
      this.position.set({
        top: rect.bottom + 6,
        left: null,
        right: window.innerWidth - rect.right,
        width: null,
      });
    } else {
      this.position.set({ top: rect.bottom + 6, left: rect.left, right: null, width: rect.width });
    }
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
