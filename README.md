# NWM — Text to Speech

Aplikacja webowa do konwersji tekstu na mowę z panelem AI do pomocy w pisaniu ("Zapytaj"), przeglądem głosów i przełącznikiem motywu/języka.

Zbudowana w Angularze 18 (standalone components, signals, Router).

## Struktura

- `src/app/layout/` — powłoka aplikacji: `sidebar` (nawigacja), `header` (wyszukiwarka, motyw, język, przycisk Zapytaj), `ask-panel` (czat AI)
- `src/app/features/text-to-speech/` — edytor tekstu, starterowe prompty, panel ustawień (głos, model, prędkość, stabilność, podobieństwo, przesada w stylu, format wyjściowy)
- `src/app/features/voices/` — dedykowana strona `/voices` z przeszukiwalną siatką głosów
- `src/app/shared/components/` — komponenty wielokrotnego użytku: `icon`, `slider`, `dropdown` (z wersją "bottom sheet" na mobile)
- `src/app/core/` — serwisy i modele:
  - `TtsService` — wysyła żądanie do `/api/tts/synthesize`, fallback: `speechSynthesis` przeglądarki
  - `ChatService` — wysyła żądanie do `/api/chat/gemini`, fallback: szablonowe odpowiedzi demo (pomoc przy scenariuszu/reklamie/hooku)
  - `VoiceLibraryService`, `VoicePreviewService` — lista głosów + odsłuch próbki (pitch/rate na głos)
  - `ThemeService`, `TranslateService` — motyw jasny/ciemny/systemowy, i18n PL/EN

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Kolejne kroki

- Podłączyć prawdziwe API TTS (np. endpoint proxy do ElevenLabs) pod `/api/tts/synthesize`.
- Podłączyć prawdziwe API Gemini pod `/api/chat/gemini` (obecnie panel Zapytaj działa w trybie demo z szablonowymi odpowiedziami).
- Dodać odtwarzacz audio z wygenerowanym plikiem oraz historię generacji.
- Prawdziwe próbki audio głosów zamiast podglądu opartego o `speechSynthesis` przeglądarki.
