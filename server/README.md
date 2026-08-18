# nwm-server

Backend API for the NWM text-to-speech app: authentication (email/password
+ Google OAuth2), quota-aware TTS job orchestration, S3-backed audio
storage, Stripe billing (subscriptions + character top-ups), in-app
notifications, and a RabbitMQ queue that hands actual synthesis off to a
Python worker (`../worker`). This service does **not** synthesize speech
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
Python TTS worker (../worker — Coqui XTTS v2, see its README for setup
      │  and an important licensing caveat before charging money for this)
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

### Running with the Angular frontend

The frontend (repo root, `ng serve`) is a full client of this API — real
login/register, Google OAuth, password reset, notifications, billing
checkout, and TTS generation all go through it, no more mock services. In
dev, `proxy.conf.json` at the repo root forwards `/api`, `/oauth2`, and
`/login` from `http://localhost:4200` to this backend on `:8080` (wired
into `ng serve` via `angular.json`'s `serve.configurations.development`),
so `npm start` and this backend running side by side is enough — no env
var changes needed. `src/environments/environment.ts` has `apiUrl: ''`;
only set it to an absolute URL if the frontend and backend end up
deployed on genuinely different origins in production (this backend's
CORS config already allows credentials for that case).

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
Angular app's `/auth/callback` route reads `token` (or `error`) from the
query string and calls `GET /api/users/me` to complete the session.

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
- **Per-user rate limiting**: once logged in, `/api/tts/**` and
  `/api/billing/**` (excluding the public webhook) are also limited per
  account (`RATE_LIMIT_USER_CAPACITY`/`RATE_LIMIT_USER_REFILL`, default
  30/minute) — the IP-based limiter above only covers the unauthenticated
  auth endpoints.
- **Admin role**: `/api/admin/**` requires `ROLE_ADMIN`, enforced both at
  the `SecurityConfig` request-matcher level and via `@PreAuthorize` on
  `AdminController` (method security is explicitly enabled —
  `@EnableMethodSecurity` — specifically so `hasRole('ADMIN')` is actually
  evaluated, not just declared). There's no self-service way to become an
  admin; set the `role` column to `ADMIN` directly in the database.
- **Content-Security-Policy**: `default-src 'self'` plus the minimum
  relaxations Swagger UI at `/docs` needs (`unsafe-inline` for its bundled
  script/style), `frame-ancestors 'none'`.

## Password reset & email verification

- `POST /api/auth/forgot-password` `{ email }` → always `200`, whether or
  not the email is registered (no account enumeration). If it matches a
  local account, a single-use, 1-hour token is issued and emailed.
- `POST /api/auth/reset-password` `{ token, newPassword }` → sets the new
  password, resets the lockout counter, and revokes every existing refresh
  token for the account (a password reset is treated as "this account may
  have been compromised").
- `POST /api/auth/verify-email` `{ token }` → confirms the address; the
  token is issued automatically on registration (24-hour validity) and can
  be re-sent via `POST /api/auth/verify-email/resend` (authenticated).

Emails are sent via `EmailService` — `SmtpEmailService` (real SMTP,
`spring-boot-starter-mail`) when `MAIL_ENABLED=true`, or
`LoggingEmailService` (logs the link instead of sending) when it's `false`
(the `.env.example` default), so the whole flow is exercisable — and is
exercised by `PasswordResetAndEmailVerificationTest` — without SMTP
credentials.

## Admin

Support/ops tooling for `ROLE_ADMIN` accounts, under `/api/admin`:

- `GET /users?query=` — paginated, optional email substring search
- `GET /users/{id}` — full account detail (plan, quota, subscription
  status, lockout state)
- `POST /users/{id}/grant-characters` `{ amount }` — comp bonus
  characters without going through Stripe (refunds, support gestures)
- `POST /users/{id}/plan` `{ planId }` — manually override a user's plan
- `GET /jobs?status=` — browse generation jobs across all users, for
  troubleshooting a report

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
activated/canceled, payment failed, payment succeeded (subscription
renewal only — the first payment on a new subscription is covered by the
activation notification instead), and top-up purchased (including admin
character grants). Adding a new notification type is a one-line call to
`NotificationService.notify(...)` from wherever the triggering event
happens.

## Folders

A single-level (no nesting) way for a user to organize their generated
audio — `GenerationJob` rows optionally point at a `GenerationFolder` via
a plain `folder_id` column (not a JPA relationship; nothing needs to
navigate from job to folder in code, only filter/display by its id).

- `GET /api/folders` — the user's folders, each with a `jobCount`.
- `POST /api/folders` — create (`{"name": "..."}`).
- `PATCH /api/folders/{id}` — rename.
- `DELETE /api/folders/{id}` — deletes the folder and unfiles its jobs
  (`folder_id` -> null) rather than deleting them. `GenerationFolderService`
  does this explicitly rather than relying on the FK's `ON DELETE SET
  NULL` alone, since Flyway is disabled in the test profile (Hibernate
  generates that schema from entities, and a plain `@Column` carries no FK
  for it to apply cascade behavior to) — the DB constraint is still there
  as a safety net for any future direct-delete code path, but the app
  can't lean on it to actually be exercised by the test suite.
- `PATCH /api/tts/jobs/{id}/folder` — move a job (`{"folderId": "..."}`,
  or `null` to unfile it back to the top-level view).
- `GET /api/tts/history?folderId=...` — the existing paginated history
  endpoint, now optionally filtered to one folder.

## Logging

Every request gets an `X-Request-Id` (reused if the client already sent
one), attached to the SLF4J MDC so every log line for that request —
across filters, services, and the access-log line `RequestLoggingFilter`
emits — can be correlated. In the `docker`/`prod` Spring profiles, logs
are emitted as JSON (`logstash-logback-encoder`) for shipping to a log
aggregator; the default/`test` profile logs a human-readable line to the
console instead. See `src/main/resources/logback-spring.xml`.

## What's deliberately out of scope for this pass

- **Real email delivery by default**: `MAIL_ENABLED=false` out of the box
  — password reset and verification links are logged, not emailed, until
  real SMTP credentials are configured. See "Password reset & email
  verification" above.
- **Distributed rate limiting / lockout**: rate limiting (both the
  IP-based auth limiter and the per-user TTS/billing limiter) is
  single-instance, in-memory Bucket4j state — a multi-node deployment
  needs a Redis-backed bucket instead. Account lockout is DB-backed and
  already safe across nodes.
- **Metrics/tracing**: Actuator exposes `health` (DB, S3, and — via
  Spring Boot's own autoconfiguration — RabbitMQ) and `info`, but there's
  no Micrometer/Prometheus metrics registry or distributed tracing wired
  up yet.
- **CI/CD**: no pipeline configuration for this module yet (build/test is
  manual — `mvn test`).
- **Resilience beyond timeouts**: Stripe and S3 calls have connect/read
  timeouts set so a hung dependency can't hang a request thread forever,
  but there's no retry/circuit-breaker layer (e.g. Resilience4j) yet.
- **Testcontainers-based integration tests**: the dependency is in
  `pom.xml`, but every test currently runs against H2 — this sandbox has
  no Docker daemon to actually exercise Flyway/native queries against a
  real Postgres. Worth adding once there's a CI environment with Docker.
- **The Python worker itself**: this repo only defines the queue contract
  it expects; the worker is a separate project that doesn't exist yet.
  Without it, TTS jobs stay `PENDING` forever — everything else (auth,
  billing, notifications) works fully end to end regardless.

## Tests

```bash
mvn test
```

Runs against an in-memory H2 database with messaging disabled
(`app.messaging.enabled=false` in the `test` profile) — no Docker
required. Covers: application context boot, the full
register → login → refresh (with rotation) → logout flow including
negative cases (wrong password, reused refresh token, duplicate email),
account lockout after repeated failed logins, TTS quota enforcement
(accepted within quota, `402 Payment Required` over quota, `401`
unauthenticated), notifications, the Stripe webhook (signature
verification + replay/idempotency, using a real HMAC-SHA256 signature
computed the same way Stripe does), password reset and email
verification (with `EmailService` mocked to capture the link instead of
sending it), per-user rate limiting (tripped with an artificially low
test-only capacity), and the admin endpoints (including that a non-admin
gets `403`).

The `docker-compose.yml` stack (real Postgres/RabbitMQ/MinIO) is what
actually exercises Flyway migrations against Postgres and the RabbitMQ
listener — verify that manually with `docker compose up` in an
environment with a Docker daemon available.

## Environment variables

See `.env.example` for the full list with defaults. Nothing sensitive has
a real default baked into `application.yml` beyond obviously-fake local
dev placeholders (`nwm`/`nwm`) — every secret must be set via environment
variable for anything beyond local development.
