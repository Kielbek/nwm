# NWM — Text to Speech

Aplikacja webowa do konwersji tekstu na mowę, zaprojektowana w stylu edytora ElevenLabs (sidebar nawigacyjny, edytor tekstu ze startowymi promptami, panel ustawień głosu po prawej).

Zbudowana w Angularze 18 (standalone components, signals).

## Struktura

- `src/app/layout/` — powłoka aplikacji: `sidebar` (nawigacja) i `header` (pasek górny z wyszukiwarką)
- `src/app/features/text-to-speech/` — główny widok: edytor tekstu, starterowe prompty, panel ustawień (głos, model, prędkość, stabilność, podobieństwo, przesada w stylu, format wyjściowy)
- `src/app/shared/components/` — komponenty wielokrotnego użytku: `icon`, `slider` (suwak), `dropdown`
- `src/app/core/` — modele domenowe (`models/tts.models.ts`) i `TtsService`, który wysyła żądanie do `/api/tts/synthesize`, a w razie braku backendu korzysta z wbudowanego w przeglądarkę `speechSynthesis` jako fallbacku demo

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Kolejne kroki

- Podłączyć prawdziwe API TTS (np. endpoint proxy do ElevenLabs) pod `/api/tts/synthesize`.
- Dodać odtwarzacz audio z wygenerowanym plikiem oraz historię generacji (zakładka "Historia" widoczna w oryginalnym designie).
- Podłączyć routing dla pozostałych pozycji menu (Głosy, Studio, Flowy itd.), obecnie działa tylko widok Text to Speech.
