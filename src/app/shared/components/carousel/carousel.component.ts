import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  Input,
  OnDestroy,
  QueryList,
  ViewChild,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Horizontal, snap-scrolling carousel. Mark each projected item with a
 * `#carouselItem` template reference so the carousel can measure it for
 * arrow-button paging and dot pagination. The native scrollbar is hidden;
 * the arrows and dots are the only visible scroll affordance.
 */
@Component({
  selector: 'app-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="carousel">
      <div class="carousel__track" #track (scroll)="onScroll()">
        <ng-content></ng-content>
      </div>

      <button
        type="button"
        class="carousel__nav carousel__nav--prev"
        [attr.aria-label]="prevLabel"
        [disabled]="atStart()"
        (click)="scrollByPage(-1)"
      >
        <app-icon name="chevron-right" [size]="16" class="carousel__prev-icon" />
      </button>

      <button
        type="button"
        class="carousel__nav carousel__nav--next"
        [attr.aria-label]="nextLabel"
        [disabled]="atEnd()"
        (click)="scrollByPage(1)"
      >
        <app-icon name="chevron-right" [size]="16" />
      </button>
    </div>

    @if ((items?.length ?? 0) > 1) {
      <div class="carousel__dots">
        @for (item of items?.toArray(); track $index) {
          <button
            type="button"
            class="carousel__dot"
            [class.carousel__dot--active]="activeIndex() === $index"
            [attr.aria-label]="'Slide ' + ($index + 1)"
            (click)="scrollToIndex($index)"
          ></button>
        }
      </div>
    }
  `,
  styleUrl: './carousel.component.scss',
})
export class CarouselComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @Input() prevLabel = 'Previous';
  @Input() nextLabel = 'Next';

  @ContentChildren('carouselItem', { read: ElementRef })
  items?: QueryList<ElementRef<HTMLElement>>;

  @ViewChild('track') trackRef?: ElementRef<HTMLElement>;

  readonly activeIndex = signal(0);
  readonly atStart = signal(true);
  readonly atEnd = signal(false);

  private resizeObserver?: ResizeObserver;

  ngAfterContentInit(): void {
    this.items?.changes.subscribe(() => this.updateState());
  }

  ngAfterViewInit(): void {
    // Deferred to the next frame: reading scrollWidth/clientWidth synchronously
    // here can race the browser's first layout pass for freshly-inserted,
    // lazy-loaded component styles and report a false "no overflow".
    requestAnimationFrame(() => this.updateState());
    if (this.trackRef) {
      this.resizeObserver = new ResizeObserver(() => this.updateState());
      this.resizeObserver.observe(this.trackRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onScroll(): void {
    this.updateState();
  }

  scrollByPage(direction: 1 | -1): void {
    const track = this.trackRef?.nativeElement;
    if (!track) {
      return;
    }
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });
  }

  scrollToIndex(index: number): void {
    const items = this.items?.toArray();
    const track = this.trackRef?.nativeElement;
    const target = items?.[index]?.nativeElement;
    if (!track || !target) {
      return;
    }
    track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  }

  private updateState(): void {
    const track = this.trackRef?.nativeElement;
    const items = this.items?.toArray();
    if (!track || !items || !items.length) {
      return;
    }

    this.atStart.set(track.scrollLeft <= 4);
    this.atEnd.set(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);

    const trackLeft = track.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Infinity;
    items.forEach((item, i) => {
      const distance = Math.abs(item.nativeElement.getBoundingClientRect().left - trackLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });
    this.activeIndex.set(closestIndex);
  }
}
