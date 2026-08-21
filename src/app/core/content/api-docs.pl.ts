import { ApiDocsContent } from './api-docs.types';

const SYNTHESIZE_REQUEST = `curl -X POST https://nwm.app/api/tts/synthesize \\
  -H "Authorization: Bearer TWÓJ_KLUCZ_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Witaj w NWM!",
    "voiceId": "marek",
    "modelId": "natural",
    "outputFormat": "mp3-128",
    "settings": {
      "speed": 1.0,
      "stability": 0.5,
      "similarity": 0.85,
      "styleExaggeration": 0,
      "languageOverride": false
    }
  }'`;

const SYNTHESIZE_RESPONSE = `{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "text": "Witaj w NWM!",
  "voiceId": "marek",
  "modelId": "natural",
  "outputFormat": "mp3-128",
  "characterCount": 13,
  "durationSeconds": null,
  "downloadUrl": null,
  "errorMessage": null,
  "createdAt": "2026-08-21T10:15:00Z",
  "folderId": null,
  "chunks": []
}`;

const JOB_REQUEST = `curl https://nwm.app/api/tts/jobs/3fa85f64-5717-4562-b3fc-2c963f66afa6 \\
  -H "Authorization: Bearer TWÓJ_KLUCZ_API"`;

const JOB_RESPONSE = `{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "COMPLETED",
  "text": "Witaj w NWM!",
  "voiceId": "marek",
  "modelId": "natural",
  "outputFormat": "mp3-128",
  "characterCount": 13,
  "durationSeconds": 1.8,
  "downloadUrl": "/api/tts/jobs/3fa85f64.../download",
  "errorMessage": null,
  "createdAt": "2026-08-21T10:15:00Z",
  "folderId": null,
  "chunks": [
    { "index": 0, "total": 1, "url": "https://cdn.nwm.app/...", "durationSeconds": 1.8 }
  ]
}`;

const HISTORY_REQUEST = `curl "https://nwm.app/api/tts/history?page=0&size=20" \\
  -H "Authorization: Bearer TWÓJ_KLUCZ_API"`;

const HISTORY_RESPONSE = `{
  "content": [
    { "id": "3fa85f64-...", "status": "COMPLETED", "text": "Witaj w NWM!", "voiceId": "marek", ... }
  ],
  "totalElements": 42,
  "totalPages": 3,
  "number": 0,
  "last": false
}`;

const AUTH_CODE = `curl https://nwm.app/api/tts/history \\
  -H "Authorization: Bearer TWÓJ_KLUCZ_API"`;

const ERROR_CODE = `{
  "timestamp": "2026-08-21T10:15:00Z",
  "status": 429,
  "message": "Too many requests — please slow down.",
  "details": []
}`;

export const apiDocsPl: ApiDocsContent = {
  title: 'API',
  subtitle:
    'Ten sam interfejs REST, na którym działa aplikacja webowa NWM — generuj mowę, sprawdzaj status zadań i pobieraj historię bezpośrednio z własnego kodu.',
  baseUrlLabel: 'Adres bazowy',
  baseUrl: 'https://nwm.app/api',
  authLabel: 'Uwierzytelnianie',
  authValue: 'Bearer token',
  rateLimitLabel: 'Limit zapytań',
  rateLimitValue: '30 / min',
  copyCode: 'Kopiuj',
  codeCopied: 'Skopiowano',
  paramNameHeader: 'Parametr',
  paramTypeHeader: 'Typ',
  paramRequiredHeader: 'Wymagany',
  paramDescriptionHeader: 'Opis',
  requiredBadge: 'wymagany',
  optionalBadge: 'opcjonalny',
  binaryResponseNote: 'Odpowiedź to plik binarny (audio), nie JSON.',
  sections: [
    {
      id: 'overview',
      title: 'Wprowadzenie',
      icon: 'globe',
      intro:
        'API NWM pozwala generować nagrania mowy, śledzić postęp zadań i przeglądać historię programistycznie — dokładnie tak samo, jak robi to nasza aplikacja webowa.',
      bullets: [
        'Wszystkie żądania i odpowiedzi używają formatu JSON w kodowaniu UTF-8.',
        'Adres bazowy wszystkich endpointów to https://nwm.app/api.',
        'Znaczniki czasu są zwracane w formacie ISO 8601 (UTC).',
        'Identyfikatory zadań i folderów to standardowe UUID.',
      ],
    },
    {
      id: 'auth',
      title: 'Uwierzytelnianie',
      icon: 'lock',
      intro:
        'Każde żądanie musi zawierać nagłówek Authorization z Twoim kluczem API jako tokenem typu Bearer. Klucz wygenerujesz i zarządzasz nim w sekcji powyżej.',
      code: { label: 'cURL', code: AUTH_CODE },
      bullets: [
        'Klucz API nie wygasa automatycznie — możesz go w każdej chwili wygenerować ponownie, co unieważni poprzedni.',
        'Nigdy nie umieszczaj klucza w kodzie działającym po stronie przeglądarki — trzymaj go wyłącznie na serwerze.',
      ],
    },
    {
      id: 'endpoints',
      title: 'Endpointy',
      icon: 'mic',
      intro: 'Cztery endpointy pokrywają pełny cykl życia nagrania: od zlecenia po pobranie gotowego pliku.',
      endpoints: [
        {
          id: 'synthesize',
          method: 'POST',
          path: '/tts/synthesize',
          title: 'Wygeneruj mowę',
          description:
            'Zleca wygenerowanie nagrania i natychmiast zwraca zadanie w statusie PENDING — samo generowanie odbywa się asynchronicznie.',
          params: [
            { name: 'text', type: 'string', required: true, description: 'Tekst do zamiany na mowę, maksymalnie 5000 znaków.' },
            { name: 'voiceId', type: 'string', required: true, description: 'Identyfikator głosu, np. marek, ania, kuba, zosia, tomasz.' },
            { name: 'modelId', type: 'string', required: true, description: 'Identyfikator modelu generowania, np. natural.' },
            { name: 'outputFormat', type: 'string', required: true, description: 'Format wyjściowy: mp3-128, mp3-192, wav lub ogg.' },
            { name: 'settings', type: 'object', required: true, description: 'speed (0.5–2.0), stability (0–1), similarity (0–1), styleExaggeration (0–1), languageOverride (bool).' },
          ],
          request: { label: 'cURL', code: SYNTHESIZE_REQUEST },
          response: { label: 'Odpowiedź 202', code: SYNTHESIZE_RESPONSE },
        },
        {
          id: 'get-job',
          method: 'GET',
          path: '/tts/jobs/{id}',
          title: 'Sprawdź status zadania',
          description: 'Zwraca bieżący stan zadania — odpytuj cyklicznie, aż status zmieni się na COMPLETED lub FAILED.',
          params: [{ name: 'id', type: 'UUID', required: true, description: 'Identyfikator zadania zwrócony przez /tts/synthesize.' }],
          request: { label: 'cURL', code: JOB_REQUEST },
          response: { label: 'Odpowiedź 200', code: JOB_RESPONSE },
        },
        {
          id: 'download',
          method: 'GET',
          path: '/tts/jobs/{id}/download',
          title: 'Pobierz plik audio',
          description:
            'Strumieniuje gotowy plik audio zadania w statusie COMPLETED — odpowiedź to surowe dane binarne, nie JSON.',
          params: [{ name: 'id', type: 'UUID', required: true, description: 'Identyfikator ukończonego zadania.' }],
        },
        {
          id: 'history',
          method: 'GET',
          path: '/tts/history',
          title: 'Lista wygenerowanych nagrań',
          description: 'Zwraca stronicowaną historię Twoich zadań, najnowsze pierwsze.',
          params: [
            { name: 'page', type: 'int', required: false, description: 'Numer strony, licząc od 0. Domyślnie 0.' },
            { name: 'size', type: 'int', required: false, description: 'Liczba elementów na stronę, maksymalnie 50. Domyślnie 20.' },
            { name: 'folderId', type: 'UUID', required: false, description: 'Ogranicza wyniki do wskazanego folderu.' },
          ],
          request: { label: 'cURL', code: HISTORY_REQUEST },
          response: { label: 'Odpowiedź 200', code: HISTORY_RESPONSE },
        },
      ],
    },
    {
      id: 'limits',
      title: 'Limity i błędy',
      icon: 'help',
      intro:
        'Zapytania do endpointów TTS są ograniczone do 30 na minutę na konto. Po przekroczeniu limitu API odpowiada kodem 429 do czasu jego odnowienia.',
      code: { label: 'Przykład błędu', code: ERROR_CODE },
      errorRows: [
        { code: '400', meaning: 'Nieprawidłowe dane wejściowe — sprawdź pole details w odpowiedzi.' },
        { code: '401', meaning: 'Brak lub nieprawidłowy klucz API.' },
        { code: '403', meaning: 'Brak dostępu do wskazanego zasobu.' },
        { code: '404', meaning: 'Zasób o podanym identyfikatorze nie istnieje.' },
        { code: '429', meaning: 'Przekroczony limit zapytań — spróbuj ponownie za chwilę.' },
        { code: '500', meaning: 'Nieoczekiwany błąd po stronie serwera.' },
      ],
    },
  ],
};
