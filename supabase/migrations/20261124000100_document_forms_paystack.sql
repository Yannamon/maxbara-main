create table if not exists public.document_drafts (
  case_id uuid not null references public.cases(id) on delete cascade,
  document_type text not null,
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (case_id, document_type)
);
alter table public.document_drafts enable row level security;
revoke all on public.document_drafts from public, anon, authenticated;
grant select, insert, update, delete on public.document_drafts to service_role;

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('manual', 'orange_money', 'mtn_momo', 'wave', 'card', 'paystack'));
alter table public.payments add column if not exists checkout_url text;
