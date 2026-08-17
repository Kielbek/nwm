-- Opaque, hashed tokens for password reset and email verification, mirroring
-- the refresh_tokens pattern: only a SHA-256 hash of the raw token is ever
-- stored, and each row is single-use (consumed_at set on redemption).
create table verification_tokens (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references users (id) on delete cascade,
    token_hash   varchar(255) not null unique,
    type         varchar(30) not null,
    expires_at   timestamptz not null,
    consumed_at  timestamptz,
    created_at   timestamptz not null default now()
);

create index idx_verification_tokens_user_id on verification_tokens (user_id, type);
