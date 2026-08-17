# nwm-server

Backend API for the NWM text-to-speech app: authentication (email/password
+ Google OAuth2), quota-aware TTS job orchestration, S3-backed audio
storage, Stripe billing (subscriptions + character top-ups), in-app
notifications, and a RabbitMQ queue that hands actual synthesis off to a
separate Python worker. This service does **not** synthesize speech
itself — it authenticates users, enforces plan quotas, handles payments,
persists job state, and brokers work to the worker via RabbitMQ.

## Stack

- Java 21, Spring Boot 3.3
- Spring Security (stateless JWT + Google OAuth2 login)
- Spring Data JPA + PostgreSQL + Flyway
- Spring AMQP (RabbitMQ)
- AWS SDK v2 for S3 (works against real AWS S3 or a self-hosted MinIO)
- Stripe (Checkout, Billing Portal, webhooks) for subscriptions and
  one-time character top-ups
- Bucket4j (per-IP rate limiting on auth endpoints) + account lockout
  after repeated failed logins
- Structured JSON logging (logstash encoder) with per-request correlation
  IDs in `docker`/`prod` profiles
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
- **Account lockout**: after `LOCKOUT_FAILURE_THRESHOLD` (default 5)
  consecutive failed login attempts, the account is locked for
  `LOCKOUT_DURATION_MINUTES` (default 15) — further attempts return
  `423 Locked` even with the correct password. A successful login resets
  the counter. This is per-account state in the database (not per-IP like
  the rate limiter above), so it survives across IPs/devices.

## Billing (Stripe)

Subscriptions and one-time character top-ups both go through Stripe
Checkout; plan/cycle changes and cancellations that happen inside Stripe's
own Billing Portal are synced back via webhook.

- `POST /api/billing/checkout/subscription` `{ planId, billingCycle }` →
  creates (or reuses) a Stripe Customer for the user, starts a
  subscription-mode Checkout Session, returns `{ url }` to redirect the
  browser to.
- `POST /api/billing/checkout/topup` `{ topUpId }` → payment-mode Checkout
  Session for a one-time character pack (`small`/`medium`/`large`, see
  `TopUpCatalog`).
- `POST /api/billing/portal` → Stripe Billing Portal session URL, for
  managing/canceling a subscription or updating a payment method.
- `POST /api/billing/subscription/cancel` → cancels at the end of the
  current billing period (not immediately).
- `POST /api/billing/webhook` (public, signature-verified) → Stripe calls
  this on `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, and `invoice.payment_failed`. Every
  event is verified against `STRIPE_WEBHOOK_SECRET`
  (`Webhook.constructEvent`, 400 on a bad signature) and deduplicated by
  Stripe event ID (`processed_stripe_events` table) so Stripe's automatic
  redelivery-until-2xx behavior can never double-credit a top-up or
  double-fire a notification.

Plan and top-up definitions (`PlanCatalog`, `TopUpCatalog`) mirror the
Angular frontend's hardcoded pricing data exactly, and the actual Stripe
Price ID for each `(plan, billing cycle)` pair — or each top-up pack — is
looked up from `STRIPE_PRICE_*` env vars via `StripePriceCatalog`. Leaving
one blank means checkout for that specific combination fails with a clear
error instead of silently charging the wrong amount.

Set `STRIPE_ENABLED=false` (the `.env.example` default) to run everything
else without Stripe configured — all billing beans and endpoints are
conditionally disabled, and the app boots normally without a secret key.
Flip it to `true` plus fill in `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
and the price IDs once you're ready to test payments (Stripe CLI's
`stripe listen --forward-to localhost:8080/api/billing/webhook` is the
easiest way to get webhooks into local dev).

## Notifications

A minimal in-app notification feed — no email/push delivery, just rows in
a table the frontend can poll or show a bell icon for.

- `GET /api/notifications` (paginated, newest first)
- `GET /api/notifications/unread-count`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`

Events that currently create a notification: welcome message on
registration, TTS generation failure (with a refund note), subscription
activated/canceled, payment failed, and top-up purchased. Adding a new
notification type is a one-line call to `NotificationService.notify(...)`
from wherever the triggering event happens.

## Logging

Every request gets an `X-Request-Id` (reused if the client already sent
one), attached to the SLF4J MDC so every log line for that request —
across filters, services, and the access-log line `RequestLoggingFilter`
emits — can be correlated. In the `docker`/`prod` Spring profiles, logs
are emitted as JSON (`logstash-logback-encoder`) for shipping to a log
aggregator; the default/`test` profile logs a human-readable line to the
console instead. See `src/main/resources/logback-spring.xml`.

## What's deliberately out of scope for this pass

- **Email verification / password reset emails**: the `email_verified`
  flag exists on the user and is exposed via the API, but no email is
  actually sent anywhere yet. Wiring real delivery (SES/SMTP) is a
  follow-up. Notifications above are in-app only, not email/push.
- **Admin/moderation endpoints**: the `Role` enum has `ADMIN` but nothing
  currently checks for it beyond `@PreAuthorize` being ready to.
- **Distributed rate limiting / lockout**: both are single-instance state
  (in-memory bucket, DB row respectively) — the lockout is already safe
  across nodes since it's DB-backed, but the IP rate limiter is not and
  would need a Redis-backed Bucket4j bucket behind a load balancer.
- **Metrics/tracing**: Actuator health/info is exposed, but there's no
  Micrometer/Prometheus metrics registry or distributed tracing wired up
  yet.
- **CI/CD**: no pipeline configuration for this module yet (build/test is
  manual — `mvn test`).
- **Frontend integration**: the Angular app does not call this backend
  yet — it still runs entirely on local mock services backed by
  `localStorage`. Wiring it up (real HTTP calls, the `/auth/callback`
  route for Google OAuth, Stripe Checkout redirects, the notification
  bell) is a separate, not-yet-started piece of work.
- **The Python worker itself**: this repo only defines the queue contract
  it expects; the worker is a separate project that doesn't exist yet.

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
