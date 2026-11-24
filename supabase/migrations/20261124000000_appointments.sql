create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  request_token uuid not null unique,
  contact_name text not null,
  contact_email text not null,
  preferred_date date not null,
  preferred_time time not null,
  timezone text not null,
  topic text not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists appointment_requests_owner_idx on public.appointment_requests(auth_user_id, created_at);
alter table public.appointment_requests enable row level security;
revoke all on public.appointment_requests from public, anon, authenticated;
grant select, insert, update, delete on public.appointment_requests to service_role;
