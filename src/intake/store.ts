import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { db, transaction } from "../server/database";
export { databaseConfigured as intakeDatabaseConfigured } from "../server/database";
import type { Estimate, Locale, Quiz } from "../site/answers";
import { checklist, documentMime, documentLimit, type Intake } from "./documents";
import { privateStorage } from "./supabase";

type User = { id: string; phone: string };
type StoredCase = {
  id: string;
  reference: string;
  status: "draft" | "submitted" | "delivered";
  expected_date: string | null;
  next_step: string | null;
  company_name: string;
  legal_form: string;
  capital_fcfa: string;
  intake: Intake | null;
  is_owner: boolean;
  is_admin: boolean;
  quote_id: string | null;
  package: Estimate["package"] | null;
  kind: Estimate["kind"] | null;
  lines: Estimate["lines"] | null;
  total_fcfa: string | null;
  payment_method: PaymentMethod | null;
  payment_status: "pending" | "paid" | null;
};
type CaseDocument = { document_type: string; original_filename: string };

export const paymentMethods = ["manual", "orange_money", "mtn_momo", "wave", "card", "paystack"] as const;
type PaymentMethod = (typeof paymentMethods)[number];

export async function listCases(user: User) {
  const result = await db().query<Pick<StoredCase, "reference" | "status" | "company_name">>(`
    select c.reference, c.status, co.name as company_name
    from public.cases c
    join public.companies co on co.id = c.company_id
    join public.users owner on owner.id = co.owner_id
    where owner.auth_user_id = $1
    order by c.created_at desc
  `, [user.id]);
  return result.rows;
}

export async function readCase(user: User, reference: string) {
  const result = await db().query<StoredCase>(`
    select c.id, c.reference, c.status, c.expected_date::text, c.next_step, c.intake,
      co.name as company_name, co.legal_form, co.capital_fcfa,
      coalesce(actor.id = co.owner_id, false) as is_owner, actor.role = 'admin' as is_admin,
      q.id as quote_id, q.package, q.kind, q.lines, q.total_fcfa,
      p.method as payment_method, p.status as payment_status
    from public.cases c
    join public.companies co on co.id = c.company_id
    join public.users actor on actor.auth_user_id = $1
    left join lateral (
      select id, package, kind, lines, total_fcfa
      from public.quotes where case_id = c.id order by created_at desc, id desc limit 1
    ) q on true
    left join public.payments p on p.quote_id = q.id and p.status in ('pending', 'paid')
    where c.reference = $2 and (actor.id = co.owner_id or actor.role = 'admin')
  `, [user.id, reference]);
  return result.rows[0] ?? null;
}

export async function readDocuments(caseId: string) {
  const result = await db().query<CaseDocument>(`
    select document_type, original_filename from public.documents
    where case_id = $1 order by created_at, id
  `, [caseId]);
  return result.rows;
}

export async function readDocumentDrafts(caseId: string) {
  const result = await db().query<{ document_type: string; fields: Record<string, string> }>(
    "select document_type,fields from public.document_drafts where case_id=$1", [caseId]);
  return Object.fromEntries(result.rows.map(row => [row.document_type, row.fields]));
}

export async function createCase(
  user: User, locale: Locale, token: string, name: string, company: string,
  quiz: Extract<Quiz, { state: "quoted" | "review" }>, flags: Intake["flags"], details?: Intake["details"],
) {
  return transaction(async (client) => {
    // Serialize retries before looking up an existing application.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [token]);
    const existing = await client.query<{ reference: string }>(`
      select c.reference
      from public.cases c
      join public.companies co on co.id = c.company_id
      join public.users u on u.id = co.owner_id
      where c.intake_token = $1 and u.auth_user_id = $2
    `, [token, user.id]);
    if (existing.rows[0]) return existing.rows[0].reference;

    const profile = await client.query<{ id: string }>(`
      insert into public.users (auth_user_id, display_name, phone, locale)
      values ($1, $2, $3, $4)
      on conflict (auth_user_id) do update
        set display_name = excluded.display_name, phone = excluded.phone, locale = excluded.locale
      returning id
    `, [user.id, name, user.phone || null, locale]);
    const ownerId = profile.rows[0].id;
    const { answers } = quiz;
    const companyRow = await client.query<{ id: string }>(`
      insert into public.companies (owner_id, name, legal_form, capital_fcfa)
      values ($1, $2, $3, $4) returning id
    `, [ownerId, company, answers.form, Number(answers.capital)]);
    const reference = `MB-${randomBytes(8).toString("hex").toUpperCase()}`;
    const caseRow = await client.query<{ id: string }>(`
      insert into public.cases (company_id, reference, intake, intake_token)
      values ($1, $2, $3, $4) returning id
    `, [companyRow.rows[0].id, reference, JSON.stringify({ answers, flags, details }), token]);
    const caseId = caseRow.rows[0].id;
    if (quiz.state === "quoted") {
      const { quote } = quiz;
      await client.query(`
      insert into public.quotes (case_id, package, kind, statutes, currency, lines,
        total_fcfa, cost_floor_fcfa, requires_verification)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [caseId, quote.package, quote.kind, quote.statutes, quote.currency, JSON.stringify(quote.lines),
      quote.totalFcfa, quote.costFloorFcfa, quote.requiresVerification]);
    }
    await client.query(`
      insert into public.case_events (case_id, actor_id, event_type) values ($1, $2, 'draft')
    `, [caseId, ownerId]);
    return reference;
  });
}

async function lockCase(client: PoolClient, user: User, reference: string, staff = false) {
  const result = await client.query<{
    id: string; status: StoredCase["status"]; intake: Intake | null; actor_id: string;
  }>(`
    select c.id, c.status, c.intake, actor.id as actor_id
    from public.cases c
    join public.companies co on co.id = c.company_id
    join public.users actor on actor.auth_user_id = $1
    where c.reference = $2 and case when $3 then actor.role = 'admin' else co.owner_id = actor.id end
    for update of c
  `, [user.id, reference, staff]);
  return result.rows[0];
}

export async function uploadDocument(user: User, reference: string, type: string, file: File) {
  if (!file.size || file.size > documentLimit) return "file_size";
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = documentMime(bytes);
  if (!mime) return "file_type";
  const name = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").trim().slice(0, 180) || "document";
  return transaction(async (client) => {
    const record = await lockCase(client, user, reference);
    if (!record?.intake || record.status !== "draft") return "unavailable";
    if (!checklist(record.intake).some((item) => item.id === type)) return "unavailable";

    const documentHash = createHash("sha256").update(bytes).digest("hex");
    const path = `${record.id}/${type}/${documentHash}`;
    const inserted = await client.query(`
      insert into public.documents (case_id, uploaded_by, document_type, original_filename, storage_path, content_type)
      values ($1, $2, $3, $4, $5, $6) on conflict (storage_path) do nothing returning id
    `, [record.id, record.actor_id, type, name, path, mime]);
    if (inserted.rowCount) {
      const { error } = await privateStorage().upload(path, bytes, {
        contentType: mime, upsert: true, cacheControl: "0",
      });
      if (error) throw new Error("Storage rejected the document upload.", { cause: error });
    }
    return "uploaded";
  });
}

export async function submitCase(user: User, reference: string) {
  return transaction(async (client) => {
    const record = await lockCase(client, user, reference);
    if (!record?.intake) return "unavailable";
    if (record.status === "submitted") return "submitted";
    if (record.status !== "draft") return "unavailable";
    const { rows } = await client.query<{ document_type: string }>(
      "select distinct document_type from public.documents where case_id = $1", [record.id],
    );
    const uploaded = new Set(rows.map((row) => row.document_type));
    if (checklist(record.intake).some((item) => item.required && !uploaded.has(item.id))) return "files_missing";

    await client.query("update public.cases set status = 'submitted', submitted_at = now() where id = $1", [record.id]);
    await client.query(`
      insert into public.case_events (case_id, actor_id, event_type) values ($1, $2, 'submitted')
    `, [record.id, record.actor_id]);
    return "submitted";
  });
}

export async function choosePayment(user: User, reference: string, method: PaymentMethod) {
  return transaction(async (client) => {
    const record = await lockCase(client, user, reference);
    if (!record?.intake || record.status === "delivered") return "unavailable";
    const result = await client.query(`
      insert into public.payments (quote_id, method, amount_fcfa)
      select q.id, $2, q.total_fcfa
      from (
        select id, kind, total_fcfa from public.quotes
        where case_id = $1 order by created_at desc, id desc limit 1
      ) q where q.kind = 'estimate'
      on conflict (quote_id) where status in ('pending', 'paid')
        do update set method = excluded.method
        where public.payments.status = 'pending' and public.payments.method <> 'paystack'
      returning id
    `, [record.id, method]);
    return result.rowCount ? "payment_saved" : "unavailable";
  });
}

export async function markManualPayment(user: User, reference: string, paid: boolean) {
  return transaction(async (client) => {
    const record = await lockCase(client, user, reference, true);
    if (!record) return "unavailable";
    const result = await client.query(`
      update public.payments p
      set status = $2, paid_at = case when $2 = 'paid' then coalesce(p.paid_at, now()) else null end
      where p.quote_id = (
        select id from public.quotes where case_id = $1 order by created_at desc, id desc limit 1
      ) and p.method = 'manual' and p.status in ('pending', 'paid') and p.status <> $2
      returning p.id
    `, [record.id, paid ? "paid" : "pending"]);
    if (result.rowCount) {
      await client.query(`
        insert into public.case_events (case_id, actor_id, event_type, is_internal)
        values ($1, $2, $3, true)
      `, [record.id, record.actor_id, paid ? "manual_payment_paid" : "manual_payment_reopened"]);
    }
    return result.rowCount ? "payment_updated" : "unavailable";
  });
}
