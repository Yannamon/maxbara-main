import pg from "pg";
import { pricing } from "../src/config/pricing.ts";
import { computeQuote, type QuoteRequest } from "../src/server/quote.ts";

const demos = [
  { status: "draft", package: "essentiel", hasAddress: true, nextStep: "Compléter le dossier" },
  { status: "submitted", package: "serenite", hasAddress: false, nextStep: "Attendre le retour du guichet" },
  { status: "delivered", package: "diaspora", hasAddress: true, nextStep: null },
] satisfies Array<Pick<QuoteRequest, "package" | "hasAddress"> & { status: string; nextStep: string | null }>;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Renseignez DATABASE_URL avant de charger les dossiers de démonstration.");
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query("begin");

  for (const [index, demo] of demos.entries()) {
    const number = index + 1;
    const userId = `00000000-0000-4000-8001-00000000000${number}`;
    const companyId = `00000000-0000-4000-8002-00000000000${number}`;
    const caseId = `00000000-0000-4000-8003-00000000000${number}`;
    const eventId = `00000000-0000-4000-8004-00000000000${number}`;
    const quoteId = `00000000-0000-4000-8005-00000000000${number}`;
    const { legalForm, capitalFcfa } = pricing.scenario;
    const quote = computeQuote({ legalForm, capitalFcfa, package: demo.package, hasAddress: demo.hasAddress });

    await client.query(
      "insert into public.users (id, display_name) values ($1, $2) on conflict (id) do nothing",
      [userId, `Client démo ${number}`],
    );
    await client.query(
      `insert into public.companies (id, owner_id, name, legal_form, capital_fcfa)
       values ($1, $2, $3, $4, $5) on conflict (id) do nothing`,
      [companyId, userId, `Société démo ${number}`, legalForm, capitalFcfa],
    );
    await client.query(
      `insert into public.cases (id, company_id, reference, status, next_step, submitted_at, delivered_at)
       values ($1, $2, $3, $4, $5, case when $4 <> 'draft' then now() end,
         case when $4 = 'delivered' then now() end) on conflict (id) do nothing`,
      [caseId, companyId, `MB-DEMO-00${number}`, demo.status, demo.nextStep],
    );
    await client.query(
      `insert into public.case_events (id, case_id, event_type, detail)
       values ($1, $2, $3, $4) on conflict (id) do nothing`,
      [eventId, caseId, demo.status, "Dossier de démonstration"],
    );
    await client.query(
      `insert into public.quotes (id, case_id, package, kind, statutes, currency, lines,
         total_fcfa, cost_floor_fcfa, requires_verification)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict (id) do nothing`,
      [quoteId, caseId, quote.package, quote.kind, quote.statutes, quote.currency,
        JSON.stringify(quote.lines), quote.totalFcfa, quote.costFloorFcfa, quote.requiresVerification],
    );
  }

  await client.query("commit");
  console.log("Dossiers de démonstration disponibles : draft, submitted, delivered.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
