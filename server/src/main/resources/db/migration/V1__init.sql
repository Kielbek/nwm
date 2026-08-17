create table users (
    id              uuid primary key default gen_random_uuid(),
    email           varchar(255) not null unique,
    name            varchar(255) not null,
    password_hash   varchar(255),
    avatar_url      varchar(1024),
    provider        varchar(20) not null default 'LOCAL',
    role            varchar(20) not null default 'USER',
    email_verified  boolean not null default false,
    plan_id         varchar(20) not null default 'free',
    billing_cycle   varchar(10) not null default 'monthly',
    characters_used bigint not null default 0,
    bonus_characters bigint not null default 0,
    plan_renews_at  date,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index idx_users_email on users (email);

create table refresh_tokens (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users (id) on delete cascade,
    token_hash  varchar(255) not null unique,
    expires_at  timestamptz not null,
    revoked_at  timestamptz,
    created_at  timestamptz not null default now()
);

create index idx_refresh_tokens_user_id on refresh_tokens (user_id);
create index idx_refresh_tokens_token_hash on refresh_tokens (token_hash);

create table generation_jobs (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references users (id) on delete cascade,
    status           varchar(20) not null default 'PENDING',
    text             text not null,
    voice_id         varchar(50) not null,
    model_id         varchar(50) not null,
    output_format    varchar(20) not null,
    settings_json     text not null,
    character_count  integer not null,
    audio_s3_key     varchar(1024),
    duration_seconds numeric(10, 2),
    error_message    varchar(2000),
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index idx_generation_jobs_user_id on generation_jobs (user_id, created_at desc);
create index idx_generation_jobs_status on generation_jobs (status);
