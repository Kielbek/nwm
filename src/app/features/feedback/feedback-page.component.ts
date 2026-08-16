import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { FeedbackService } from '../../core/services/feedback.service';
import { TranslateService } from '../../core/services/translate.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-feedback-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, StarRatingComponent],
  templateUrl: './feedback-page.component.html',
  styleUrl: './feedback-page.component.scss',
})
export class FeedbackPageComponent {
  readonly filterRating = signal<number | null>(null);

  readonly filteredTestimonials = computed(() => {
    const rating = this.filterRating();
    const list = this.feedback.testimonials();
    return rating ? list.filter((t) => t.rating === rating) : list;
  });

  readonly averageLabel = computed(() => this.feedback.averageRating().toFixed(1));

  readonly formName = signal('');
  readonly formRating = signal(0);
  readonly formComment = signal('');

  readonly canSubmit = computed(
    () => !!this.formName().trim() && !!this.formComment().trim() && this.formRating() >= 1
  );

  constructor(
    readonly feedback: FeedbackService,
    readonly translate: TranslateService,
    seo: SeoService
  ) {
    effect(() => seo.setPrivateTitle(this.translate.dict().seo.feedbackTitle));
  }

  toggleFilter(stars: number): void {
    this.filterRating.set(this.filterRating() === stars ? null : stars);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.feedback.submit(this.formName(), this.formRating(), this.formComment());
    this.formName.set('');
    this.formRating.set(0);
    this.formComment.set('');
  }
}
