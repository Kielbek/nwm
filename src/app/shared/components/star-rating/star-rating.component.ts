import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="star-rating" [style.--star-size.px]="size" [class.star-rating--interactive]="interactive">
      @for (star of stars; track star) {
        <span
          class="star-rating__star"
          [class.star-rating__star--interactive]="interactive"
          (click)="onStarClick(star)"
        >
          <span class="star-rating__bg">★</span>
          <span class="star-rating__fg" [style.width.%]="fillPercent(star)">★</span>
        </span>
      }
    </div>
  `,
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  @Input() value = 0;
  @Input() max = 5;
  @Input() size = 16;
  @Input() interactive = false;
  @Output() valueChange = new EventEmitter<number>();

  get stars(): number[] {
    return Array.from({ length: this.max }, (_, i) => i + 1);
  }

  fillPercent(star: number): number {
    const diff = this.value - (star - 1);
    return Math.max(0, Math.min(1, diff)) * 100;
  }

  onStarClick(star: number): void {
    if (this.interactive) {
      this.valueChange.emit(star);
    }
  }
}
