import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="slider-field">
      <div class="slider-field__label-row">
        <span class="slider-field__label">{{ label }}</span>
      </div>
      <input
        class="slider-field__input"
        type="range"
        [min]="min"
        [max]="max"
        [step]="step"
        [ngModel]="value"
        (ngModelChange)="onChange($event)"
        [style.--fill]="fillPercent + '%'"
      />
      <div class="slider-field__caption-row">
        <span>{{ minLabel }}</span>
        <span>{{ maxLabel }}</span>
      </div>
    </div>
  `,
  styleUrl: './slider.component.scss',
})
export class SliderComponent {
  @Input() label = '';
  @Input() minLabel = '';
  @Input() maxLabel = '';
  @Input() min = 0;
  @Input() max = 1;
  @Input() step = 0.01;
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();

  get fillPercent(): number {
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }

  onChange(value: number): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
