create table if not exists public.user_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid not null,
  deleted_email text not null,
  deleted_role text not null,
  deleted_by uuid not null references auth.users(id) on delete restrict,
  deleted_by_email text not null,
  deleted_at timestamptz not null default now()
);

alter table public.user_deletion_audit enable row level security;

revoke all on public.user_deletion_audit from anon, authenticated;
grant select, insert on public.user_deletion_audit to service_role;

comment on table public.user_deletion_audit is
  'Minimal non-restorable audit metadata for permanent portal-account deletion.';
