import "server-only";
import type { PoolClient } from "pg";
import type { Estimate } from "../site/answers";
import type { Intake } from "../intake/documents";
import { db, transaction } from "../server/database";
import { deliveryDays, pageSize, reviewHours, type CaseStatus, type Filters } from "./model";

type CaseRow = {
  intake: Intake | null;
  id: string;
  reference: string;
  status: CaseStatus;
  company_name: string;
  legal_form: string;
  total_fcfa: string | null;
  margin_fcfa: string | null;
  kind: Estimate["kind"] | null;
  requires_verification: boolean;
  review_due: Date | null;
  delivery_due: Date | null;
  evaluated_at: Date;
};

const deadlineParams = [reviewHours, deliveryDays * 24];
const caseColumns = `
  c.id, c.reference, c.status, c.created_at, c.intake, co.name as company_name, co.legal_form,
  q.kind, q.total_fcfa, q.total_fcfa - q.cost_floor_fcfa as margin_fcfa,
  coalesce(q.requires_verification, false) as requires_verification,
  case when c.status = 'submitted' and c.reviewed_at is null
    then c.submitted_at + make_interval(hours => $1::int) end as review_due,
  case when c.status = 'submitted'
    then c.submitted_at + make_interval(hours => $2::int) end as delivery_due,
  statement_timestamp() as evaluated_at
`;
const latestQuote = `
  left join lateral (
    select * from public.quotes where case_id = c.id order by created_at desc, id desc limit 1
  ) q on true
`;

export async function adminCases(filters: Filters) {
  const listing = await db().query<CaseRow>(`
    with cases as (
      select ${caseColumns}
      from public.cases c join public.companies co on co.id = c.company_id
      ${latestQuote}
      where ($3 = '' or c.status = $3)
        and ($4 = '' or strpos(lower(c.reference), lower($4)) > 0 or strpos(lower(co.name), lower($4)) > 0)
    )
    select * from cases
    where $5 = ''
      or ($5 = 'review' and review_due is not null)
      or ($5 = 'delivery' and delivery_due is not null)
      or ($5 = 'overdue' and (review_due <= evaluated_at or delivery_due <= evaluated_at))
    order by case when review_due <= evaluated_at or delivery_due <= evaluated_at then 0 else 1 end, least(review_due, delivery_due) asc nulls last, created_at desc, reference desc
    limit $6 offset $7
  `, [...deadlineParams, filters.status, filters.search, filters.deadline, pageSize + 1, (filters.page - 1) * pageSize]);
  return { rows: listing.rows.slice(0, pageSize), hasNext: listing.rows.length > pageSize };
}

export async function deadlineCounts() {
  const { rows } = await db().query<{
    review_open: number; review_overdue: number; delivery_open: number; delivery_overdue: number;
  }>(`
    with deadlines as (
      select case when reviewed_at is null then submitted_at + make_interval(hours => $1::int) end as review_due,
        submitted_at + make_interval(hours => $2::int) as delivery_due
      from public.cases where status = 'submitted'
    )
    select count(review_due)::int as review_open,
      count(*) filter (where review_due <= statement_timestamp())::int as review_overdue,
      count(delivery_due)::int as delivery_open,
      count(*) filter (where delivery_due <= statement_timestamp())::int as delivery_overdue
    from deadlines
  `, deadlineParams);
  return rows[0];
}

type Detail = CaseRow & {
  capital_fcfa: string | null;
  statutes: Estimate["statutes"] | null;
  expected_date: string | null;
  next_step: string | null;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  delivered_at: Date | null;
  lines: Estimate["lines"] | null;
  contact: string;
  phone: string | null;
  payment_method: string | null;
  payment_status: "pending" | "paid" | null;
};

export async function adminCase(reference: string) {
  const { rows } = await db().query<Detail>(`
    select ${caseColumns}, co.capital_fcfa, c.expected_date::text, c.next_step, c.submitted_at, c.reviewed_at, c.delivered_at,
      q.lines, q.statutes, u.display_name as contact, u.phone, p.method as payment_method, p.status as payment_status
    from public.cases c
    join public.companies co on co.id = c.company_id
    join public.users u on u.id = co.owner_id
    ${latestQuote}
    left join public.payments p on p.quote_id = q.id and p.status in ('pending', 'paid')
    where c.reference = $3
  `, [...deadlineParams, reference]);
  return rows[0] ?? null;
}

export async function adminCaseItems(id: string) {
  const [documents, notes] = await Promise.all([
    db().query<{ id: string; original_filename: string; content_type: string | null; document_type: string }>(`
      select id, original_filename, content_type, document_type from public.documents
      where case_id = $1 order by created_at desc, id
    `, [id]),
    db().query<{ id: string; detail: string; author: string | null; created_at: Date }>(`
      select e.id, e.detail, u.display_name as author, e.created_at
      from public.case_events e left join public.users u on u.id = e.actor_id
      where e.case_id = $1 and e.is_internal and e.event_type = 'internal_note'
      order by e.created_at desc, e.id
    `, [id]),
  ]);
  return { documents: documents.rows, notes: notes.rows };
}

export async function adminDocument(reference: string, documentId: string) {
  const { rows } = await db().query<{ storage_path: string; content_type: string | null; original_filename: string }>(`
    select d.storage_path, d.content_type, d.original_filename
    from public.documents d join public.cases c on c.id = d.case_id
    where c.reference = $1 and d.id = $2
  `, [reference, documentId]);
  return rows[0] ?? null;
}

async function lockAdminCase(client: PoolClient, authId: string, reference: string) {
  const { rows } = await client.query<{
    id: string; actor: string; status: CaseStatus; reviewed_at: Date | null;
    expected_date: string | null; next_step: string | null;
  }>(`
    select c.id, c.status, c.reviewed_at, c.expected_date::text, c.next_step, u.id as actor
    from public.cases c join public.users u on u.auth_user_id = $1 and u.role = 'admin'
    where c.reference = $2 for update of c
  `, [authId, reference]);
  return rows[0];
}

export async function setProgress(authId: string, reference: string, status: CaseStatus, next: string | null, expected: string | null) {
  return transaction(async (client) => {
    const record = await lockAdminCase(client, authId, reference);
    if (!record) return false;
    if (record.status === status && record.next_step === next && record.expected_date === expected) return true;
    await client.query(`
      update public.cases set status = $2, next_step = $3, expected_date = $4,
        submitted_at = case when $2 = 'draft' then null else coalesce(submitted_at, statement_timestamp()) end,
        delivered_at = case when $2 = 'delivered' then coalesce(delivered_at, statement_timestamp()) else null end,
        reviewed_at = case when $2 = 'draft' then null else reviewed_at end
      where id = $1
    `, [record.id, status, next, expected]);
    await client.query(`
      insert into public.case_events (case_id, actor_id, event_type, detail, is_internal)
      values ($1, $2, 'admin_progress_updated', $3, true)
    `, [record.id, record.actor, JSON.stringify({ from: record.status, to: status })]);
    return true;
  });
}

export async function completeReview(authId: string, reference: string) {
  return transaction(async (client) => {
    const record = await lockAdminCase(client, authId, reference);
    if (record?.status !== "submitted") return false;
    if (record.reviewed_at) return true;
    await client.query("update public.cases set reviewed_at = statement_timestamp() where id = $1", [record.id]);
    await client.query(`
      insert into public.case_events (case_id, actor_id, event_type, is_internal)
      values ($1, $2, 'admin_review_completed', true)
    `, [record.id, record.actor]);
    return true;
  });
}

export async function addInternalNote(authId: string, reference: string, detail: string, token: string) {
  return transaction(async (client) => {
    const record = await lockAdminCase(client, authId, reference);
    if (!record) return false;
    await client.query(`
      insert into public.case_events (case_id, actor_id, event_type, detail, is_internal, event_token)
      values ($1, $2, 'internal_note', $3, true, $4)
      on conflict (event_token) do nothing
    `, [record.id, record.actor, detail, token]);
    return true;
  });
}
