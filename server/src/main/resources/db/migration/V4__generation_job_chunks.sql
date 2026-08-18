create table generation_job_chunks (
    id               uuid primary key default gen_random_uuid(),
    job_id           uuid not null references generation_jobs (id) on delete cascade,
    chunk_index      integer not null,
    total_chunks     integer not null,
    audio_s3_key     varchar(1024) not null,
    duration_seconds numeric(10, 2),
    created_at       timestamptz not null default now(),
    unique (job_id, chunk_index)
);

create index idx_generation_job_chunks_job_id on generation_job_chunks (job_id, chunk_index);
