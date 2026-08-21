import { ApiDocsContent } from './api-docs.types';

const SYNTHESIZE_REQUEST = `curl -X POST https://nwm.app/api/tts/synthesize \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello from NWM!",
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
  "text": "Hello from NWM!",
  "voiceId": "marek",
  "modelId": "natural",
  "outputFormat": "mp3-128",
  "characterCount": 16,
  "durationSeconds": null,
  "downloadUrl": null,
  "errorMessage": null,
  "createdAt": "2026-08-21T10:15:00Z",
  "folderId": null,
  "chunks": []
}`;

const JOB_REQUEST = `curl https://nwm.app/api/tts/jobs/3fa85f64-5717-4562-b3fc-2c963f66afa6 \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

const JOB_RESPONSE = `{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "COMPLETED",
  "text": "Hello from NWM!",
  "voiceId": "marek",
  "modelId": "natural",
  "outputFormat": "mp3-128",
  "characterCount": 16,
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
  -H "Authorization: Bearer YOUR_API_KEY"`;

const HISTORY_RESPONSE = `{
  "content": [
    { "id": "3fa85f64-...", "status": "COMPLETED", "text": "Hello from NWM!", "voiceId": "marek", ... }
  ],
  "totalElements": 42,
  "totalPages": 3,
  "number": 0,
  "last": false
}`;

const AUTH_CODE = `curl https://nwm.app/api/tts/history \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

const ERROR_CODE = `{
  "timestamp": "2026-08-21T10:15:00Z",
  "status": 429,
  "message": "Too many requests — please slow down.",
  "details": []
}`;

export const apiDocsEn: ApiDocsContent = {
  title: 'API',
  subtitle:
    "The same REST interface that powers the NWM web app — generate speech, check job status, and pull your history straight from your own code.",
  baseUrlLabel: 'Base URL',
  baseUrl: 'https://nwm.app/api',
  authLabel: 'Authentication',
  authValue: 'Bearer token',
  rateLimitLabel: 'Rate limit',
  rateLimitValue: '30 / min',
  copyCode: 'Copy',
  codeCopied: 'Copied',
  paramNameHeader: 'Parameter',
  paramTypeHeader: 'Type',
  paramRequiredHeader: 'Required',
  paramDescriptionHeader: 'Description',
  requiredBadge: 'required',
  optionalBadge: 'optional',
  binaryResponseNote: 'The response is a binary audio file, not JSON.',
  sections: [
    {
      id: 'overview',
      title: 'Overview',
      icon: 'globe',
      intro:
        'The NWM API lets you generate speech, track job progress, and browse history programmatically — the exact same way our web app does.',
      bullets: [
        'Every request and response uses JSON encoded as UTF-8.',
        'All endpoints are rooted at https://nwm.app/api.',
        'Timestamps are returned in ISO 8601 (UTC).',
        'Job and folder identifiers are standard UUIDs.',
      ],
    },
    {
      id: 'auth',
      title: 'Authentication',
      icon: 'lock',
      intro:
        'Every request must include an Authorization header with your API key as a Bearer token. Generate and manage your key in the section above.',
      code: { label: 'cURL', code: AUTH_CODE },
      bullets: [
        "Your API key doesn't expire automatically — regenerate it any time to invalidate the previous one.",
        'Never ship the key inside browser-side code — keep it on your server only.',
      ],
    },
    {
      id: 'endpoints',
      title: 'Endpoints',
      icon: 'mic',
      intro: 'Four endpoints cover the full lifecycle of a recording, from request to download.',
      endpoints: [
        {
          id: 'synthesize',
          method: 'POST',
          path: '/tts/synthesize',
          title: 'Generate speech',
          description:
            'Queues a generation job and immediately returns it in PENDING status — the actual synthesis happens asynchronously.',
          params: [
            { name: 'text', type: 'string', required: true, description: 'Text to convert to speech, up to 5000 characters.' },
            { name: 'voiceId', type: 'string', required: true, description: 'Voice identifier, e.g. marek, ania, kuba, zosia, tomasz.' },
            { name: 'modelId', type: 'string', required: true, description: 'Generation model identifier, e.g. natural.' },
            { name: 'outputFormat', type: 'string', required: true, description: 'Output format: mp3-128, mp3-192, wav, or ogg.' },
            { name: 'settings', type: 'object', required: true, description: 'speed (0.5–2.0), stability (0–1), similarity (0–1), styleExaggeration (0–1), languageOverride (bool).' },
          ],
          request: { label: 'cURL', code: SYNTHESIZE_REQUEST },
          response: { label: '202 response', code: SYNTHESIZE_RESPONSE },
        },
        {
          id: 'get-job',
          method: 'GET',
          path: '/tts/jobs/{id}',
          title: 'Check job status',
          description: 'Returns the job\'s current state — poll it until the status becomes COMPLETED or FAILED.',
          params: [{ name: 'id', type: 'UUID', required: true, description: 'Job id returned by /tts/synthesize.' }],
          request: { label: 'cURL', code: JOB_REQUEST },
          response: { label: '200 response', code: JOB_RESPONSE },
        },
        {
          id: 'download',
          method: 'GET',
          path: '/tts/jobs/{id}/download',
          title: 'Download the audio file',
          description: "Streams the finished audio for a COMPLETED job — the response is raw binary data, not JSON.",
          params: [{ name: 'id', type: 'UUID', required: true, description: 'Id of a completed job.' }],
        },
        {
          id: 'history',
          method: 'GET',
          path: '/tts/history',
          title: 'List generated recordings',
          description: 'Returns a paginated list of your jobs, newest first.',
          params: [
            { name: 'page', type: 'int', required: false, description: 'Zero-based page number. Defaults to 0.' },
            { name: 'size', type: 'int', required: false, description: 'Items per page, capped at 50. Defaults to 20.' },
            { name: 'folderId', type: 'UUID', required: false, description: 'Restricts results to the given folder.' },
          ],
          request: { label: 'cURL', code: HISTORY_REQUEST },
          response: { label: '200 response', code: HISTORY_RESPONSE },
        },
      ],
    },
    {
      id: 'limits',
      title: 'Rate limits & errors',
      icon: 'help',
      intro:
        'TTS endpoints are capped at 30 requests per minute per account. Exceeding the limit returns a 429 until it refills.',
      code: { label: 'Error example', code: ERROR_CODE },
      errorRows: [
        { code: '400', meaning: 'Invalid input — check the details field in the response.' },
        { code: '401', meaning: 'Missing or invalid API key.' },
        { code: '403', meaning: "You don't have access to this resource." },
        { code: '404', meaning: "The resource with that id doesn't exist." },
        { code: '429', meaning: 'Rate limit exceeded — try again shortly.' },
        { code: '500', meaning: 'Unexpected server error.' },
      ],
    },
  ],
};
