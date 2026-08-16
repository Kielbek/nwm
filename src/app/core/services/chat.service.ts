import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { TranslateService } from './translate.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ChatResponse {
  reply: string;
}

/**
 * Talks to a backend Gemini proxy at /api/chat/gemini when one is
 * configured. Falls back to a templated, keyword-aware demo reply focused
 * on script/ad-writing help so the panel is useful without a backend/API
 * key — same pattern as TtsService's browser-speech fallback.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly apiUrl = '/api/chat/gemini';
  private nextId = 0;

  readonly messages = signal<ChatMessage[]>([]);
  readonly isSending = signal(false);

  constructor(private readonly http: HttpClient, private readonly translate: TranslateService) {}

  send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || this.isSending()) {
      return;
    }

    this.pushMessage('user', trimmed);
    this.isSending.set(true);

    this.http
      .post<ChatResponse>(this.apiUrl, { message: trimmed, history: this.messages() })
      .pipe(
        tap((res) => {
          this.pushMessage('assistant', res.reply);
          this.isSending.set(false);
        }),
        catchError(() => {
          this.pushMessage('assistant', this.demoReply(trimmed));
          this.isSending.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  clear(): void {
    this.messages.set([]);
  }

  private pushMessage(role: ChatMessage['role'], text: string): void {
    this.messages.update((msgs) => [...msgs, { id: `${this.nextId++}`, role, text }]);
  }

  private demoReply(prompt: string): string {
    const isPolish = this.translate.lang() === 'pl';
    const lower = prompt.toLowerCase();

    if (/reklam|advert|\bad\b/.test(lower)) {
      return isPolish
        ? 'Oto szkic 30-sekundowej reklamy:\n\n1. Hook (0–3s): zaskakujące pytanie lub stwierdzenie związane z problemem odbiorcy.\n2. Problem (3–10s): nazwij ból, z którym się mierzą.\n3. Rozwiązanie (10–22s): przedstaw produkt i jedną kluczową korzyść.\n4. CTA (22–30s): jasne wezwanie do działania.\n\n(To odpowiedź demo — podłącz backend pod /api/chat/gemini, aby rozmawiać z prawdziwym Gemini.)'
        : "Here's a 30-second ad skeleton:\n\n1. Hook (0–3s): a surprising question or statement tied to the listener's problem.\n2. Problem (3–10s): name the pain point.\n3. Solution (10–22s): introduce the product and one key benefit.\n4. CTA (22–30s): a clear call to action.\n\n(This is a demo reply — connect a backend at /api/chat/gemini to chat with real Gemini.)";
    }

    if (/hook|pierwsz.*zdani/.test(lower)) {
      return isPolish
        ? 'Kilka pomysłów na mocny hook:\n\n– Zacznij od pytania, na które słuchacz chce znać odpowiedź.\n– Otwórz zaskakującą liczbą lub statystyką.\n– Zacznij w połowie akcji ("Drzwi się otworzyły i...").\n\n(Odpowiedź demo — bez podłączonego backendu Gemini.)'
        : "A few strong-hook ideas:\n\n– Open with a question the listener wants answered.\n– Lead with a surprising number or stat.\n– Drop them into the middle of the action (\"The door swung open, and...\").\n\n(Demo reply — no Gemini backend connected yet.)";
    }

    if (/skróć|shorten|krótsz|trim/.test(lower)) {
      return isPolish
        ? 'Żeby skrócić tekst: usuń przymiotniki, które nie zmieniają sensu, połącz zdania o tym samym temacie i zostaw jedno mocne zdanie na koniec jako puentę.\n\n(Odpowiedź demo — bez podłączonego backendu Gemini.)'
        : 'To trim text down: cut adjectives that don\'t change the meaning, merge sentences covering the same point, and leave one strong closing line as the takeaway.\n\n(Demo reply — no Gemini backend connected yet.)';
    }

    if (/ton|tone|barw/.test(lower)) {
      return isPolish
        ? 'Dobór tonu głosu zależy od odbiorcy: energiczny i pewny głos dobrze pasuje do reklam produktów, spokojny i narracyjny do treści edukacyjnych, a ciepły i przyjazny do materiałów lifestyle\'owych. Sprawdź zakładkę "Głosy", żeby odsłuchać próbki.\n\n(Odpowiedź demo — bez podłączonego backendu Gemini.)'
        : 'Picking a voice tone depends on the audience: energetic and confident works well for product ads, calm and narrative for educational content, warm and friendly for lifestyle content. Check the "Voices" page to preview samples.\n\n(Demo reply — no Gemini backend connected yet.)';
    }

    return isPolish
      ? 'To jest odpowiedź demonstracyjna — panel Zapytaj nie ma jeszcze podłączonego prawdziwego API Gemini. Podłącz backend pod /api/chat/gemini, aby uzyskiwać właściwe odpowiedzi. W międzyczasie mogę podpowiedzieć strukturę scenariusza, hook, ton głosu albo pomóc skrócić tekst — po prostu zapytaj.'
      : "This is a demo reply — the Ask panel isn't connected to a real Gemini API yet. Wire up a backend at /api/chat/gemini for real responses. In the meantime I can suggest a script structure, a hook, a voice tone, or help trim your text — just ask.";
  }
}
