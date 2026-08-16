import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { TranslateService } from './translate.service';

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  date: string;
  avatarColor: string;
  rating: number;
  verified: boolean;
}

interface TestimonialMeta {
  avatarColor: string;
  rating: number;
  verified: boolean;
}

const TESTIMONIAL_META: TestimonialMeta[] = [
  { avatarColor: '#fbcfe8', rating: 5, verified: true },
  { avatarColor: '#bfdbfe', rating: 5, verified: true },
  { avatarColor: '#fde68a', rating: 4, verified: true },
  { avatarColor: '#c7d2fe', rating: 5, verified: true },
  { avatarColor: '#bbf7d0', rating: 3, verified: true },
  { avatarColor: '#fecaca', rating: 5, verified: true },
];

const NEW_REVIEW_COLORS = ['#c7d2fe', '#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0', '#fecaca'];

/**
 * Talks to a backend at /api/feedback when one is configured. Without a
 * backend, submitting a review still works: it's added to the local list
 * optimistically (unverified, dated "just now") — same fallback pattern
 * used across this app's other services.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly apiUrl = '/api/feedback';
  private nextId = 1000;

  readonly submitting = signal(false);
  readonly justSubmitted = signal(false);

  private readonly localSubmissions = signal<Testimonial[]>([]);

  readonly seededTestimonials = computed<Testimonial[]>(() =>
    TESTIMONIAL_META.map((meta, i) => ({
      id: `seed-${i}`,
      ...meta,
      ...this.translate.dict().testimonials[i],
    }))
  );

  readonly testimonials = computed<Testimonial[]>(() => [
    ...this.localSubmissions(),
    ...this.seededTestimonials(),
  ]);

  readonly averageRating = computed(() => {
    const list = this.testimonials();
    if (!list.length) {
      return 0;
    }
    return list.reduce((sum, t) => sum + t.rating, 0) / list.length;
  });

  readonly ratingBreakdown = computed(() => {
    const list = this.testimonials();
    const total = list.length || 1;
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = list.filter((t) => t.rating === stars).length;
      return { stars, count, percent: (count / total) * 100 };
    });
  });

  constructor(private readonly http: HttpClient, private readonly translate: TranslateService) {}

  submit(name: string, rating: number, comment: string): void {
    const trimmedName = name.trim();
    const trimmedComment = comment.trim();
    if (!trimmedName || !trimmedComment || rating < 1 || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.justSubmitted.set(false);
    this.http
      .post(this.apiUrl, { name: trimmedName, rating, comment: trimmedComment })
      .pipe(
        tap(() => this.finishSubmit(trimmedName, rating, trimmedComment)),
        catchError(() => {
          this.finishSubmit(trimmedName, rating, trimmedComment);
          return of(null);
        })
      )
      .subscribe();
  }

  private finishSubmit(name: string, rating: number, comment: string): void {
    const dict = this.translate.dict().feedbackPage;
    const color = NEW_REVIEW_COLORS[this.nextId % NEW_REVIEW_COLORS.length];
    this.localSubmissions.update((list) => [
      {
        id: `local-${this.nextId++}`,
        name,
        role: dict.newRole,
        quote: comment,
        date: dict.justNow,
        avatarColor: color,
        rating,
        verified: false,
      },
      ...list,
    ]);
    this.submitting.set(false);
    this.justSubmitted.set(true);
  }
}
