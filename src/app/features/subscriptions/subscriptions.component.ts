import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

type SubTab = 'plan' | 'api' | 'billing';
type BillingCycle = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  featured?: boolean;
  current?: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Structural/BEM redesign exercise for the subscriptions & pricing view —
 * self-contained mock data (no service wiring), focused on markup + SCSS
 * layout per spec. Interlinked with ProfileComponent's "Ulepsz plan" CTA.
 */
@Component({
  selector: 'app-subscriptions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
})
export class SubscriptionsComponent {
  @ViewChild('carousel') carouselRef?: ElementRef<HTMLElement>;

  readonly activeTab = signal<SubTab>('plan');
  readonly billingCycle = signal<BillingCycle>('monthly');
  readonly openFaqIndex = signal<number | null>(null);

  readonly charactersUsed = 676;
  readonly characterLimit = 10000;
  readonly currentPlanName = 'Pro';

  readonly plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Dla twórców testujących AI-lektora.',
      monthlyPrice: 29,
      yearlyPrice: 24,
      features: ['10 000 znaków / mies.', '5 głosów', 'Eksport MP3'],
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Dla regularnie publikujących twórców.',
      monthlyPrice: 79,
      yearlyPrice: 65,
      features: ['50 000 znaków / mies.', 'Wszystkie głosy', 'Eksport MP3/WAV', 'Priorytetowe generowanie'],
      featured: true,
      current: true,
    },
    {
      id: 'creator',
      name: 'Creator',
      description: 'Dla studiów produkujących seryjnie.',
      monthlyPrice: 149,
      yearlyPrice: 124,
      features: ['150 000 znaków / mies.', 'Klucze API', 'Klonowanie głosu', 'Wsparcie priorytetowe'],
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Dla zespołów i agencji.',
      monthlyPrice: 349,
      yearlyPrice: 290,
      features: ['500 000 znaków / mies.', 'Wielu użytkowników', 'SLA 99.9%', 'Opiekun klienta'],
    },
  ];

  readonly faq: FaqItem[] = [
    {
      question: 'Jak działa odnawianie limitu znaków?',
      answer:
        'Limit znaków z Twojej subskrypcji odnawia się automatycznie co miesiąc, w dniu rozpoczęcia okresu rozliczeniowego.',
    },
    {
      question: 'Czy niewykorzystane znaki przechodzą na kolejny miesiąc?',
      answer:
        'Nie — znaki z subskrypcji resetują się co miesiąc. Dokupione pakiety (Top-Up) nie mają terminu ważności.',
    },
    {
      question: 'Czym różnią się znaki z subskrypcji od dokupionych pakietów jednorazowych?',
      answer:
        'Znaki z subskrypcji odnawiają się co miesiąc i zużywają się jako pierwsze. Dokupione pakiety są bezterminowe i wykorzystywane dopiero po wyczerpaniu limitu miesięcznego.',
    },
    {
      question: 'Czy mogę w dowolnym momencie anulować lub zmienić plan?',
      answer: 'Tak — plan możesz zmienić lub anulować w dowolnym momencie z poziomu ustawień płatności.',
    },
    {
      question: 'Jak uzyskać dostęp do kluczy API?',
      answer: 'Klucze API są dostępne od planu Creator wzwyż — po ulepszeniu planu pojawią się w profilu.',
    },
  ];

  setTab(tab: SubTab): void {
    this.activeTab.set(tab);
  }

  setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
  }

  scrollPlans(direction: -1 | 1): void {
    const el = this.carouselRef?.nativeElement;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * 300, behavior: 'smooth' });
  }

  planPrice(plan: Plan): number {
    return this.billingCycle() === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  }
}
