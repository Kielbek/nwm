import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { FaqCopy } from '../../../core/i18n/dictionary';

/** Flat-list FAQ accordion, styled once and shared by every page that needs one (pricing, profile, …). */
@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './faq-accordion.component.html',
  styleUrl: './faq-accordion.component.scss',
})
export class FaqAccordionComponent {
  @Input({ required: true }) items: FaqCopy[] = [];

  readonly openIndex = signal<number | null>(null);

  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}
