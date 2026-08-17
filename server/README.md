# nwm-server

Backend API for the NWM text-to-speech app: authentication (email/password
+ Google OAuth2), quota-aware TTS job orchestration, S3-backed audio
storage, and a RabbitMQ queue that hands actual synthesis off to a
separate Python worker. This service does **not** synthesize speech
itself — it authenticates users, enforces plan quotas, persists job state,
and brokers work to the worker via RabbitMQ.

## Stack

- Java 21, Spring Boot 3.3
- Spring Security (stateless JWT + Google OAuth2 login)
- Spring Data JPA + PostgreSQL + Flyway
- Spring AMQP (RabbitMQ)
- AWS SDK v2 for S3 (works against real AWS S3 or a self-hosted MinIO)
- Bucket4j (per-IP rate limiting on auth endpoints)
- springdoc-openapi (Swagger UI at `/docs`)
- Testcontainers + MockMvc for integration tests

## Architecture

```
Angular frontend
      │  HTTPS + JWT bearer / httpOnly refresh cookie
      ▼
nwm-server (this service)
      │  publishes TtsJobMessage → tts.generate.requests
      ▼
Python TTS worker (separate project, not in this repo)
      │  synthesizes audio, uploads to S3, publishes TtsResultMessage
      ▼
tts.generate.results → nwm-server updates the job row, frontend polls it
```

Every generation is a row in `generation_jobs` (`PENDING` →
`PROCESSING`/`COMPLETED`/`FAILED`). Character quota is reserved
optimistically when a job is created and refunded automatically if the
worker reports `FAILED`.

### Message contract with the Python worker

**`tts.generate.requests`** (JSON body — see `TtsJobMessage`):

```json
{
  "jobId": "uuid",
  "text": "...",
  "voiceId": "marek",
  "modelId": "standard",
  "outputFormat": "mp3-128",
  "settings": { "speed": 1.0, "stability": 0.5, "similarity": 0.85, "styleExaggeration": 0.0, "languageOverride": false },
  "s3Bucket": "nwm-audio",
  "resultObjectKeyPrefix": "generations/<userId>"
}
```

The worker should synthesize the audio, upload it under a key starting
with `resultObjectKeyPrefix`, and publish to **`tts.generate.results`**
(see `TtsResultMessage`):

```json
{
  "jobId": "uuid",
  "status": "COMPLETED",
  "audioS3Key": "generations/<userId>/<jobId>.mp3",
  "durationSeconds": 4.2,
  "errorMessage": null
}
```

or, on failure, `"status": "FAILED"` with `errorMessage` set (and the
other two fields `null`) — the API refunds the reserved character quota
in that case.

## Running locally

The full stack (Postgres, RabbitMQ, MinIO, the app) runs via Docker
Compose:

```bash
cp .env.example .env   # fill in JWT_SECRET, S3 keys, Google OAuth credentials
docker compose up --build
```

- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/docs`
- RabbitMQ management UI: `http://localhost:15672`
- MinIO console: `http://localhost:9001`

Without Docker, `mvn spring-boot:run` works against a Postgres/RabbitMQ/
MinIO you run yourself, pointed at via the env vars in `.env.example`.

### Google OAuth2 setup

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth
   client ID** (Web application).
2. Authorized redirect URI: `{your-api-base-url}/login/oauth2/code/google`
   (e.g. `http://localhost:8080/login/oauth2/code/google` for local dev).
3. Put the client ID/secret in `.env` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.

**The app fails fast at startup if these are unset** — Spring's OAuth2
client autoconfiguration requires a non-empty client id for any
registration declared in `application.yml`. This is intentional: a
silently-broken "Sign in with Google" button is worse than a clear boot
error.

Login flow: `GET /oauth2/authorization/google` → Google → `POST
/login/oauth2/code/google` (handled by Spring Security) →
`OAuth2LoginSuccessHandler` issues the same access/refresh token pair a
normal login would, sets the refresh token as an httpOnly cookie, and
redirects to `{FRONTEND_URL}/auth/callback?token=<access-token>`. The
Angular app needs a route at `/auth/callback` that reads `token` from the
query string, stores it, and calls `GET /api/users/me`. (That route
doesn't exist in the Angular app yet — this backend is ready for it, but
wiring the frontend callback page is a separate piece of work.)

## Auth model

- **Access token**: short-lived (15 min default) stateless JWT, sent as
  `Authorization: Bearer <token>`.
- **Refresh token**: opaque random value, sent as an httpOnly, Secure,
  `SameSite=Lax` cookie scoped to `/api/auth`. Only a SHA-256 hash of it
  is stored server-side — a stolen database dump can't be replayed.
  Refreshing **rotates** the token (the old one is revoked immediately),
  so a leaked-and-reused old refresh token is detectable.
- **Passwords**: bcrypt, strength 12.
- **Rate limiting**: `/api/auth/login` and `/api/auth/register` are
  limited per client IP (in-memory token bucket, `RATE_LIMIT_AUTH_*` env
  vars). This is per-instance — a multi-node deployment should move to a
  Redis-backed Bucket4j bucket so the limit is shared across nodes.
- **CORS**: locked to `CORS_ALLOWED_ORIGINS` (comma-separated), not `*`.
- Generic "Invalid email or password" on login failure either way, to
  avoid leaking which emails are registered.

## What's deliberately out of scope for this pass

- **Email verification / password reset emails**: the `email_verified`
  flag exists on the user and is exposed via the API, but no email is
  actually sent anywhere yet. Wiring real delivery (SES/SMTP) is a
  follow-up.
- **Admin/moderation endpoints**: the `Role` enum has `ADMIN` but nothing
  currently checks for it beyond `@PreAuthorize` being ready to.
- **Distributed rate limiting**: see above — fine for one instance, needs
  Redis behind a load balancer.
- **The Python worker itself**: this repo only defines the queue contract
  it expects; the worker is a separate project.

## Tests

```bash
mvn test
```

Runs against an in-memory H2 database with messaging disabled
(`app.messaging.enabled=false` in the `test` profile) — no Docker
required. Covers: application context boot, the full
register → login → refresh (with rotation) → logout flow including
negative cases (wrong password, reused refresh token, duplicate email),
and TTS quota enforcement (accepted within quota, `402 Payment Required`
over quota, `401` unauthenticated).

The `docker-compose.yml` stack (real Postgres/RabbitMQ/MinIO) is what
actually exercises Flyway migrations against Postgres and the RabbitMQ
listener — verify that manually with `docker compose up` in an
environment with a Docker daemon available.

## Environment variables

See `.env.example` for the full list with defaults. Nothing sensitive has
a real default baked into `application.yml` beyond obviously-fake local
dev placeholders (`nwm`/`nwm`) — every secret must be set via environment
variable for anything beyond local development.
