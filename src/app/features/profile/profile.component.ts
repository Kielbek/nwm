import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface StatCard {
  label: string;
  value: string;
}

/**
 * Structural/BEM redesign exercise for the profile view — self-contained
 * mock data (no service wiring), focused on markup + SCSS layout per spec.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly stats: StatCard[] = [
    { label: 'Wygenerowane nagrania', value: '128' },
    { label: 'Łączny czas audio', value: '342 min' },
    { label: 'Ulubiony głos', value: 'Marek' },
  ];

  readonly usagePercent = 62;
  readonly subscriptionUsed = '6 200';
  readonly subscriptionLimit = '10 000';
  readonly renewsAt = '1 września 2026';
  readonly topUpCharacters = '50 000';

  readonly emailVerified = signal(false);
  readonly hasApiAccess = signal(false);
  readonly deleteConfirmOpen = signal(false);

  readonly defaultFormat = signal<'mp3' | 'wav' | 'ogg'>('mp3');

  setDefaultFormat(format: 'mp3' | 'wav' | 'ogg'): void {
    this.defaultFormat.set(format);
  }

  resendVerification(): void {
    // Structural stub — no backend call in this exercise.
  }

  openDeleteConfirm(): void {
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
  }
}
