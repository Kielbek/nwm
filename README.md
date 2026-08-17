# NWM — Text to Speech

Aplikacja webowa do konwersji tekstu na mowę z panelem AI do pomocy w pisaniu ("Zapytaj"), przeglądem głosów, subskrypcjami i pełnym logowaniem — podpięta pod prawdziwy backend w Springu (`/server`).

Zbudowana w Angularze 18 (standalone components, signals, Router).

## Struktura

- `src/app/features/auth/` — logowanie, rejestracja, reset hasła, weryfikacja emaila, callback Google OAuth (`AuthLayoutComponent` jako wspólna dwukolumnowa powłoka)
- `src/app/layout/` — powłoka aplikacji: `sidebar` (nawigacja), `header` (wyszukiwarka, motyw, język, powiadomienia, wylogowanie), `ask-panel` (czat AI)
- `src/app/features/text-to-speech/` — edytor tekstu, starterowe prompty, panel ustawień (głos, model, prędkość, stabilność, podobieństwo, przesada w stylu, format wyjściowy)
- `src/app/features/voices/` — dedykowana strona `/voices` z przeszukiwalną siatką głosów
- `src/app/features/profile/`, `settings/`, `checkout/` — profil z prawdziwym stanem konta/planu, ustawienia bezpieczeństwa, płatności przez Stripe Checkout (przekierowanie)
- `src/app/shared/components/` — komponenty wielokrotnego użytku: `icon`, `slider`, `dropdown` (z wersją "bottom sheet" na mobile)
- `src/app/core/` — serwisy i modele:
  - `AuthService` — rejestracja/logowanie/wylogowanie/odświeżanie sesji (token dostępu tylko w pamięci, refresh przez httpOnly cookie), reset hasła, weryfikacja emaila
  - `AccountService` — lustrzane odbicie zalogowanego użytkownika z backendu (plan, limit znaków, status weryfikacji) na te same sygnały, których używa reszta appki
  - `BillingService` — sesje Stripe Checkout/Portal (subskrypcje, doładowania, zarządzanie płatnością)
  - `NotificationsService` — prawdziwe powiadomienia z `/api/notifications` (z fallbackiem lokalnym gdy backend niedostępny)
  - `TtsService` — wysyła żądanie do `/api/tts/synthesize`, odpytuje status joba aż do ukończenia, fallback: `speechSynthesis` przeglądarki
  - `ChatService` — wysyła żądanie do `/api/chat/gemini`, fallback: szablonowe odpowiedzi demo (pomoc przy scenariuszu/reklamie/hooku)
  - `VoiceLibraryService`, `VoicePreviewService` — lista głosów + odsłuch próbki (pitch/rate na głos)
  - `ThemeService`, `TranslateService` — motyw jasny/ciemny/systemowy, i18n PL/EN
  - `core/guards/` — `authGuard` (chroni `/app/**`), `guestGuard` (zawraca zalogowanych z `/login`, `/register`)
  - `core/interceptors/auth.interceptor.ts` — dołącza token Bearer, obsługuje odświeżenie sesji po 401

## Backend

Prawdziwy serwer w Springu (Java, auth/OAuth2/Stripe/RabbitMQ/S3) leży w `/server` — zobacz `server/README.md`. Ta aplikacja Angular jest jego rzeczywistym klientem: żadnych mockowanych danych logowania czy planu, wszystko idzie przez `/api/**`.

## Development server

W `ng serve` (development) `proxy.conf.json` przekierowuje `/api`, `/oauth2` i `/login` na `http://localhost:8080`, więc uruchom backend (`cd server && mvn spring-boot:run`, albo `docker compose up` w `/server`) i odpal `ng serve` — logowanie, płatności i generowanie mowy działają od razu, bez zmian w konfiguracji. Nawiguj do `http://localhost:4200/`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Kolejne kroki

- Podłączyć prawdziwe API Gemini pod `/api/chat/gemini` (obecnie panel Zapytaj działa w trybie demo z szablonowymi odpowiedziami).
- Prawdziwe próbki audio głosów zamiast podglądu opartego o `speechSynthesis` przeglądarki.
- Właściwy worker Python do syntezy mowy — backend ma gotowy kontrakt kolejki RabbitMQ, ale worker jeszcze nie istnieje, więc joby TTS zostają w statusie `PENDING`.
