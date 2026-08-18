create table generation_folders (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users (id) on delete cascade,
    name       varchar(120) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_generation_folders_user_id on generation_folders (user_id);

alter table generation_jobs
    add column folder_id uuid references generation_folders (id) on delete set null;

create index idx_generation_jobs_folder_id on generation_jobs (folder_id);
