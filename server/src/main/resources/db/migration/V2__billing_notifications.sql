alter table users
    add column stripe_customer_id     varchar(255),
    add column stripe_subscription_id varchar(255),
    add column subscription_status    varchar(30) not null default 'NONE',
    add column failed_login_attempts  integer not null default 0,
    add column locked_until           timestamptz;

create unique index idx_users_stripe_customer_id on users (stripe_customer_id) where stripe_customer_id is not null;
create unique index idx_users_stripe_subscription_id on users (stripe_subscription_id) where stripe_subscription_id is not null;

create table notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users (id) on delete cascade,
    type        varchar(40) not null,
    title       varchar(255) not null,
    body        varchar(2000) not null,
    link        varchar(1024),
    read_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index idx_notifications_user_id on notifications (user_id, created_at desc);

-- Stripe can (and will) redeliver the same webhook event more than once;
-- recording processed event ids makes handling idempotent.
create table processed_stripe_events (
    stripe_event_id varchar(255) primary key,
    event_type      varchar(100) not null,
    processed_at    timestamptz not null default now()
);
