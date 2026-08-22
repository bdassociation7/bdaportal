-- Rate-limit records for the public Individual registration endpoint.
-- The table is written only by the Edge Function using the service-role key.

create table if not exists public.signup_rate_limits (
  identifier text primary key,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count >= 1)
);

alter table public.signup_rate_limits enable row level security;

comment on table public.signup_rate_limits is
  'Private rate-limit counters for public Individual registration requests.';

revoke all on table public.signup_rate_limits from anon, authenticated;

grant select, insert, update, delete on table public.signup_rate_limits to service_role;
