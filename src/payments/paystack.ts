import "server-only";

import { randomUUID } from "node:crypto";
import { db, transaction } from "../server/database";
import { paystackAmount, paymentMatches, type VerifiedTransaction } from "./validation";
import type { Locale } from "../site/answers";
import type { Intake } from "../intake/documents";

export function paystackConfig() {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  const origin = process.env.APP_URL?.trim() || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (!secret || !/^sk_(test|live)_\S+$/.test(secret)) return null;
  try {
    const url = new URL(origin);
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) return null;
    return { secret, origin: url.origin, mode: secret.startsWith("sk_test_") ? "test" as const : "live" as const };
  } catch { return null; }
}

async function requestPaystack<T>(path: string, body?: unknown): Promise<T> {
  const config = paystackConfig();
  if (!config) throw new Error("Paystack is not configured.");
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok || result.status !== true || !result.data) throw new Error("Paystack request failed.");
  return result.data as T;
}

export async function initializePaystack(authId: string, reference: string, email: string, locale: Locale): Promise<string> {
  const config = paystackConfig();
  if (!config || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Invalid payment configuration or email.");
  return transaction(async client => {
    const { rows } = await client.query<{ id: string; intake: Intake | null }>(`select c.id,c.intake from public.cases c
      join public.companies co on co.id=c.company_id join public.users u on u.id=co.owner_id
      where c.reference=$1 and u.auth_user_id=$2 and c.status <> 'delivered' for update of c`, [reference, authId]);
    const record = rows[0];
    if (!record) throw new Error("Application not available.");
    const quotes = await client.query<{ id: string; kind: string; total_fcfa: string; currency: string }>(
      "select id,kind,total_fcfa,currency from public.quotes where case_id=$1 order by created_at desc,id desc limit 1", [record.id]);
    const quote = quotes.rows[0];
    if (!quote || quote.kind !== "estimate" || quote.currency !== "XOF") throw new Error("A final quote is required.");
    const amount = paystackAmount(Number(quote.total_fcfa));
    const existing = await client.query<{ id: string; status: string; method: string; checkout_url: string | null; provider_reference: string | null }>(
      "select id,status,method,checkout_url,provider_reference from public.payments where quote_id=$1 and status in ('pending','paid') for update", [quote.id]);
    let active: (typeof existing.rows)[number] | undefined = existing.rows[0];
    if (active?.status === "paid") throw new Error("Already paid.");
    if (active?.method === "paystack" && active.checkout_url && active.provider_reference) {
      const verified = await requestPaystack<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(active.provider_reference)}`);
      if (verified.status === "success") {
        return `${config.origin}/api/paystack/callback?locale=${locale}&reference=${encodeURIComponent(active.provider_reference)}`;
      }
      if (["failed", "abandoned"].includes(verified.status)) {
        await client.query("update public.payments set status='failed' where id=$1 and status='pending'", [active.id]);
        active = undefined;
      } else {
        return active.checkout_url;
      }
    }
    const id = active?.id ?? randomUUID();
    const providerReference = `MBP-${randomUUID()}`;
    await client.query(`insert into public.payments(id,quote_id,method,amount_fcfa,provider_reference)
      values($1,$2,'paystack',$3,$4) on conflict(id) do update set method='paystack',amount_fcfa=excluded.amount_fcfa,
      provider_reference=excluded.provider_reference,checkout_url=null`, [id, quote.id, quote.total_fcfa, providerReference]);
    const initialized = await requestPaystack<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      email, amount, currency: "XOF", reference: providerReference,
      callback_url: `${config.origin}/api/paystack/callback?locale=${locale}`,
      metadata: { payment_id: id, case_reference: reference, cancel_action: `${config.origin}${locale === "fr" ? "/dossiers" : "/en/cases"}/${reference}#paiement` },
    });
    const url = new URL(initialized.authorization_url);
    if (initialized.reference !== providerReference || url.protocol !== "https:" || url.hostname !== "checkout.paystack.com" || url.username || url.password) throw new Error("Unexpected checkout response.");
    await client.query("update public.payments set checkout_url=$2 where id=$1", [id, url.href]);
    return url.href;
  });
}

export async function confirmPaystack(reference: string, authId?: string): Promise<{ caseReference: string; paid: boolean } | null> {
  if (!/^MBP-[0-9a-f-]{36}$/i.test(reference)) return null;
  const result = await db().query<{ id: string; amount_fcfa: string; case_id: string; case_reference: string }>(`select p.id,p.amount_fcfa,c.id as case_id,c.reference as case_reference
    from public.payments p join public.quotes q on q.id=p.quote_id join public.cases c on c.id=q.case_id
    join public.companies co on co.id=c.company_id join public.users u on u.id=co.owner_id
    where p.method='paystack' and p.provider_reference=$1 and ($2::uuid is null or u.auth_user_id=$2)`, [reference, authId ?? null]);
  const payment = result.rows[0];
  if (!payment) return null;
  const data = await requestPaystack<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
  const config = paystackConfig()!;
  const paid = paymentMatches(data, { reference, paymentId: payment.id, amountFcfa: Number(payment.amount_fcfa), mode: config.mode });
  if (!paid) return { caseReference: payment.case_reference, paid: false };
  const settled = await transaction(async client => {
    await client.query("select id from public.cases where id=$1 for update", [payment.case_id]);
    const updated = await client.query(`update public.payments set status='paid',paid_at=$2
      where id=$1 and method='paystack' and provider_reference=$3 and status='pending' returning id`, [payment.id, data.paid_at, reference]);
    if (updated.rowCount) await client.query("insert into public.case_events(case_id,event_type) values($1,'paystack_payment_paid')", [payment.case_id]);
    if (updated.rowCount) return true;
    const current = await client.query<{ status: string }>("select status from public.payments where id=$1", [payment.id]);
    return current.rows[0]?.status === "paid";
  });
  return { caseReference: payment.case_reference, paid: settled };
}
