create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null,
  phone text unique check (phone ~ '^[+]225[0-9]{10}$'),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id),
  name text not null,
  legal_form text not null,
  capital_fcfa bigint check (capital_fcfa >= 0),
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  reference text not null unique,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'delivered')),
  next_step text,
  expected_date date,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  delivered_at timestamptz,
  check (
    (status = 'draft' and submitted_at is null and delivered_at is null)
    or (status = 'submitted' and submitted_at is not null and delivered_at is null)
    or (status = 'delivered' and submitted_at is not null and delivered_at is not null)
  ),
  check (delivered_at >= submitted_at)
);

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  actor_id uuid references public.users (id),
  event_type text not null,
  detail text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  uploaded_by uuid references public.users (id),
  document_type text not null,
  original_filename text not null,
  storage_path text not null unique,
  content_type text,
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  package text not null check (package in ('essentiel', 'serenite', 'diaspora', 'agrement')),
  kind text not null check (kind in ('estimate', 'starting_at')),
  statutes text not null check (statutes in ('private_deed', 'notarized')),
  currency text not null default 'XOF' check (currency = 'XOF'),
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  total_fcfa bigint not null,
  cost_floor_fcfa bigint not null check (cost_floor_fcfa >= 0),
  requires_verification boolean not null,
  created_at timestamptz not null default now(),
  check (total_fcfa >= cost_floor_fcfa)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id),
  method text not null check (method in ('manual', 'orange_money', 'mtn_momo', 'wave', 'card')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  amount_fcfa bigint not null check (amount_fcfa > 0),
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'paid') = (paid_at is not null)),
  unique (method, provider_reference)
);

create index companies_owner_idx on public.companies (owner_id);
create index cases_company_idx on public.cases (company_id);
create index cases_status_expected_idx on public.cases (status, expected_date);
create index case_events_case_created_idx on public.case_events (case_id, created_at);
create index documents_case_idx on public.documents (case_id);
create index quotes_case_created_idx on public.quotes (case_id, created_at);
create index payments_quote_idx on public.payments (quote_id);

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.cases enable row level security;
alter table public.case_events enable row level security;
alter table public.documents enable row level security;
alter table public.quotes enable row level security;
alter table public.payments enable row level security;

-- This foundation exposes no direct table access to browser roles.
revoke all on public.users, public.companies, public.cases, public.case_events,
  public.documents, public.quotes, public.payments from public, anon, authenticated;
grant select, insert, update, delete on public.users, public.companies, public.cases,
  public.case_events, public.documents, public.quotes, public.payments to service_role;
