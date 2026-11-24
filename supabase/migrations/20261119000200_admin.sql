alter table public.cases add column reviewed_at timestamptz,
  add check (reviewed_at is null or (submitted_at is not null and reviewed_at >= submitted_at));

alter table public.case_events add column event_token uuid unique;

create index cases_active_submission_idx on public.cases (submitted_at)
  where status = 'submitted';
