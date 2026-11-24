import { randomUUID } from "node:crypto";
import { RegistrationSummary } from "../intake/registration-summary";
import { DocumentDraftReview } from "../intake/document-review";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { pricing } from "../config/pricing";
import { signOut } from "../intake/actions";
import { intakeCopy } from "../intake/copy";
import { intakePaths } from "../intake/paths";
import type { Locale, Query } from "../site/answers";
import { copy, money, otherLocale } from "../site/copy";
import { Receipt } from "../site/receipt";
import { recordReview, saveNote, setPayment, updateProgress } from "./actions";
import { requireAdmin } from "./auth";
import { adminCopy, adminDate } from "./copy";
import { adminPath, canPreview, deadlineDisplay, deliveryDays, listPath, readFilters, referencePattern, reviewHours, statuses } from "./model";
import { adminCase, adminCaseItems, adminCases, deadlineCounts } from "./store";

type CaseDetail = NonNullable<Awaited<ReturnType<typeof adminCase>>>;

function AdminFrame({ locale, alternateHref, children }: { locale: Locale; alternateHref: string; children: ReactNode }) {
  const t = adminCopy[locale];
  const alternate = otherLocale(locale);
  return (
    <>
      <header className="site-header">
        <div className="shell header-row admin-header">
          <div className="admin-brand">
            <a className="wordmark" href={adminPath(locale)}>
              <span className="brand-logo" aria-hidden="true"><img src="/maxbaralogo.png" alt="" width={1024} height={1024} /></span>
              Max Bara<span className="brand-period" aria-hidden="true">.</span>
            </a>
            <span>{t.title}</span>
          </div>
          <div className="header-actions admin-header-actions">
            <a className="admin-client-link" href={intakePaths[locale].list}>{t.client}</a>
            <div className="language-switch">
              <span aria-current="true">{locale.toUpperCase()}</span>
              <a href={alternateHref} lang={alternate} hrefLang={alternate} aria-label={alternate === "en" ? "English" : "Français"}>{alternate.toUpperCase()}</a>
            </div>
            <form action={signOut.bind(null, locale)}><button className="admin-link" type="submit">{intakeCopy[locale].signOut}</button></form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}

function Deadline({ date, now, locale }: { date: Date | null; now: Date; locale: Locale }) {
  const t = adminCopy[locale];
  const state = deadlineDisplay(date, now);
  if (!date) return <span className="admin-muted">{t.noDeadline}</span>;
  return <span className="deadline-date">
    <time dateTime={date.toISOString()}>{adminDate(date, locale)}</time>
    {state === "overdue" && <small className="deadline-overdue">{t.overdue}</small>}
  </span>;
}

function Amount({ value, locale, starting = false }: { value: string | null; locale: Locale; starting?: boolean }) {
  const t = adminCopy[locale];
  return value === null ? <span className="admin-muted">{t.anonymous}</span> : (
    <span className="admin-amount">
      {starting && <small>{t.from}</small>}
      <strong>{money(Number(value), locale)} <span>FCFA</span></strong>
    </span>
  );
}

type Fee = { label: string; amountFcfa: number; source?: string; verifiedOn?: string | null };

function FeeSources({ locale, fees }: { locale: Locale; fees: Fee[] }) {
  const t = adminCopy[locale];
  return <ul className="fee-sources">
    {fees.map((fee, index) => (
      <li key={`${index}-${fee.label}`}>
        <div>
          <strong>{fee.label}</strong>
          <p>{fee.source?.startsWith("https://")
            ? <a href={fee.source} className="admin-link" rel="noreferrer">{t.source}</a>
            : fee.source || t.anonymous}</p>
        </div>
        <div>
          <span className="fee-amount">{money(fee.amountFcfa, locale)} FCFA</span>
          {fee.verifiedOn
            ? <small>{t.verified} <time dateTime={fee.verifiedOn}>{fee.verifiedOn}</time></small>
            : <span className="verification-badge">{t.verification}</span>}
        </div>
      </li>
    ))}
  </ul>;
}

export async function AdminDashboard({ locale, query }: { locale: Locale; query: Promise<Query> }) {
  await requireAdmin(locale);
  const filters = readFilters(await query);
  const [{ rows, hasNext }, counts] = await Promise.all([adminCases(filters), deadlineCounts()]);
  const t = adminCopy[locale];
  const caseStatus = intakeCopy[locale].status;
  const cards = [
    { label: t.review, duration: `${reviewHours}\u00a0${t.hours}`, open: counts.review_open, late: counts.review_overdue, type: "review" as const },
    { label: t.delivery, duration: `${deliveryDays}\u00a0${t.days}`, open: counts.delivery_open, late: counts.delivery_overdue, type: "delivery" as const },
  ];
  const catalog = [...Object.entries(pricing.formation), ...Object.entries(pricing.options), ...Object.entries(pricing.packages)];
  const site = copy[locale];
  const labels = { ...site.lines, ...site.packages } as Record<string, string>;

  return (
    <AdminFrame locale={locale} alternateHref={listPath(otherLocale(locale), filters)}>
      <main className="shell admin-main">
        <h1>{t.heading}</h1>
        <section className="admin-deadlines" aria-label={t.deadline}>
          <p>{t.periods}</p>
          <div className="deadline-cards">
            {cards.map((card) => (
              <a href={listPath(locale, { ...filters, status: "", search: "", deadline: card.type, page: 1 })} key={card.type} className="deadline-card">
                <h2>{card.label} <span>{card.duration}</span></h2>
                <p><strong>{card.open}</strong> {t.active}<span className={card.late ? "deadline-overdue" : ""}>{card.late} {t.overdue}</span></p>
              </a>
            ))}
          </div>
        </section>
        <section aria-labelledby="admin-cases-title">
          <h2 className="admin-section-title" id="admin-cases-title">{t.list}</h2>
          <form className="admin-filters" action={adminPath(locale)} method="get">
            <label className="form-field"><span>{t.search}</span>
              <input type="search" name="search" maxLength={100} defaultValue={filters.search} />
            </label>
            <label className="form-field select-field"><span>{t.status}</span>
              <select name="status" defaultValue={filters.status}>
                <option value="">{t.allStatuses}</option>
                {statuses.map((status) => <option value={status} key={status}>{caseStatus[status]}</option>)}
              </select>
            </label>
            <label className="form-field select-field"><span>{t.deadline}</span>
              <select name="deadline" defaultValue={filters.deadline}>
                <option value="">{t.allDeadlines}</option><option value="review">{t.review}</option>
                <option value="delivery">{t.delivery}</option><option value="overdue">{t.overdue}</option>
              </select>
            </label>
            <button className="button button-small" type="submit">{t.filter}</button>
            {(filters.search || filters.status || filters.deadline) && <a className="admin-link" href={adminPath(locale)}>{t.reset}</a>}
          </form>
          {rows.length ? (
            <>
              <div className="admin-list-head admin-case-row" aria-hidden="true">
                <span>{t.company}</span><span>{t.status}</span><span>{t.reviewDue}</span><span>{t.deliveryDue}</span><span>{t.margin}</span>
              </div>
              <ul className="admin-case-list">
                {rows.map((record) => (
                  <li key={record.id}>
                    <a className="admin-case-row" href={adminPath(locale, record.reference)}>
                      <div><strong>{record.company_name}</strong><small>{record.reference} · {record.legal_form}</small></div>
                      <div><span className="case-status">{caseStatus[record.status]}</span></div>
                      <div><span className="admin-mobile-label">{t.reviewDue}</span><Deadline date={record.review_due} now={record.evaluated_at} locale={locale} /></div>
                      <div><span className="admin-mobile-label">{t.deliveryDue}</span><Deadline date={record.delivery_due} now={record.evaluated_at} locale={locale} /></div>
                      <div>
                        <span className="admin-mobile-label">{t.margin}</span>
                        <Amount value={record.margin_fcfa} locale={locale} starting={record.kind === "starting_at"} />
                        {record.requires_verification && <span className="verification-badge">{t.verification}</span>}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="admin-empty">{t.noCases}</p>}
          {(hasNext || filters.page > 1) && <nav className="admin-pagination" aria-label={t.page}>
            {filters.page > 1 && <a className="admin-link" rel="prev" href={listPath(locale, { ...filters, page: filters.page - 1 })}>{t.previous}</a>}
            <span>{t.page} {filters.page}</span>
            {hasNext && <a className="admin-link" rel="next" href={listPath(locale, { ...filters, page: filters.page + 1 })}>{t.next}</a>}
          </nav>}
        </section>
        <details className="intake-card admin-catalog"><summary>{t.catalog}</summary>
          <FeeSources locale={locale} fees={catalog.map(([code, fee]) => ({ ...fee, label: labels[code] ?? fee.label }))} />
        </details>
      </main>
    </AdminFrame>
  );
}

function ProgressForm({ locale, record }: { locale: Locale; record: CaseDetail }) {
  const t = adminCopy[locale];
  const caseStatus = intakeCopy[locale].status;
  return (
    <section className="intake-card" id="progress">
      <h2>{t.progress}</h2>
      <p>{t.clientVisible}</p>
      <form className="intake-form" action={updateProgress.bind(null, locale, record.reference)}>
        <label className="form-field select-field"><span>{t.status}</span>
          <select name="status" defaultValue={record.status}>
            {statuses.map((status) => <option value={status} key={status}>{caseStatus[status]}</option>)}
          </select>
        </label>
        <label className="form-field"><span>{t.clientNext}</span>
          <textarea name="next" rows={2} maxLength={400} defaultValue={record.next_step ?? ""} />
        </label>
        <label className="form-field"><span>{t.clientDate}</span>
          <input name="date" type="date" defaultValue={record.expected_date ?? ""} />
        </label>
        <button className="button" type="submit">{t.save}</button>
      </form>
    </section>
  );
}

function CaseDeadlines({ locale, record }: { locale: Locale; record: CaseDetail }) {
  const t = adminCopy[locale];
  return (
    <section className="intake-card" id="echeances">
      <h2>{t.timing}</h2>
      <dl className="admin-milestones">
        <div><dt>{t.received}</dt><dd>{record.submitted_at ? adminDate(record.submitted_at, locale) : t.noDeadline}</dd></div>
        <div><dt>{t.review} · {`${reviewHours}\u00a0${t.hours}`}</dt><dd><Deadline locale={locale} date={record.review_due} now={record.evaluated_at} /></dd></div>
        <div><dt>{t.delivery} · {`${deliveryDays}\u00a0${t.days}`}</dt><dd><Deadline locale={locale} date={record.delivery_due} now={record.evaluated_at} /></dd></div>
        {record.reviewed_at && <div><dt>{t.reviewed}</dt><dd>{adminDate(record.reviewed_at, locale)}</dd></div>}
        {record.delivered_at && <div><dt>{t.delivered}</dt><dd>{adminDate(record.delivered_at, locale)}</dd></div>}
      </dl>
      {record.review_due && <form className="intake-form" action={recordReview.bind(null, locale, record.reference)}>
        <button className="button button-outline" type="submit">{t.closeReview}</button>
      </form>}
    </section>
  );
}

export async function AdminCasePage({ locale, reference, query }: { locale: Locale; reference: string; query: Promise<Query> }) {
  await requireAdmin(locale);
  if (!referencePattern.test(reference)) notFound();
  const [record, params] = await Promise.all([adminCase(reference), query]);
  if (!record) notFound();
  const { documents, notes } = await adminCaseItems(record.id);
  const t = adminCopy[locale];
  const site = copy[locale];
  const client = intakeCopy[locale];
  const message = params.message === "saved" || params.message === "unavailable" ? params.message : null;
  const lines = record.lines?.map((line) => ({ ...line, label: site.lines[line.code] ?? line.label }));
  return (
    <AdminFrame locale={locale} alternateHref={adminPath(otherLocale(locale), reference)}>
      <main className="shell admin-main admin-case-main">
        <div className="admin-case-intro">
          <a className="admin-link" href={adminPath(locale)}>{t.list}</a>
          <h1>{record.company_name}</h1>
          <p className="eyebrow">{reference} · {record.legal_form}</p>
          <p>{record.contact}{record.phone && <> · <a className="admin-link" href={`tel:${record.phone}`}>{record.phone}</a></>}</p>
        </div>
        {message && <p className={`intake-feedback${message === "saved" ? " feedback-success" : ""}`}
          role={message === "saved" ? "status" : "alert"} id="feedback" tabIndex={-1}>{t.messages[message]}</p>}
        <nav className="admin-case-nav">
          <a className="admin-link" href="#progress">{t.progress}</a>
          <a className="admin-link" href="#echeances">{t.deadline}</a>
          <a className="admin-link" href="#pieces">{t.documents}</a>
          <a className="admin-link" href="#notes">{t.notes}</a>
          <a className="admin-link" href="#marge">{t.margin}</a>
        </nav>
        <div className="admin-detail-grid">
          <div>
            <ProgressForm locale={locale} record={record} />
            <RegistrationSummary locale={locale} details={record.intake?.details} />
            <DocumentDraftReview caseId={record.id} locale={locale} />
            <CaseDeadlines locale={locale} record={record} />
            <section className="intake-card" id="pieces">
              <h2>{t.documents}</h2>
              {documents.length ? <ul className="admin-document-list">
                {documents.map((doc) => {
                  const path = `${adminPath("fr", reference)}/documents/${doc.id}`;
                  const label = record.statutes === "notarized" && (doc.document_type === "statutes" || doc.document_type === "subscription")
                    ? `${doc.document_type}Notary` : doc.document_type;
                  return <li key={doc.id}>
                    <div><strong>{doc.original_filename}</strong>
                      <small>{client.document[label as keyof typeof client.document] ?? label}</small></div>
                    <div>
                      {canPreview(doc.content_type) && <a className="admin-link" href={path} target="_blank" rel="noreferrer">{t.view}</a>}
                      <a className="admin-link" href={`${path}?download=1`}>{t.download}</a>
                    </div>
                  </li>;
                })}
              </ul> : <p>{t.noDocuments}</p>}
            </section>
            <section className="intake-card" id="notes">
              <h2>{t.notes}</h2><p>{t.noteHint}</p>
              <form className="intake-form" action={saveNote.bind(null, locale, reference, randomUUID())}>
                <label className="form-field"><span>{t.writeNote}</span>
                  <textarea name="note" maxLength={2000} rows={3} required />
                </label>
                <button type="submit" className="button button-outline">{t.addNote}</button>
              </form>
              {notes.length ? <ul className="admin-note-list">
                {notes.map((note) => <li key={note.id}>
                  <p><strong>{note.author ?? t.team}</strong> · <time dateTime={note.created_at.toISOString()}>{adminDate(note.created_at, locale)}</time></p>
                  <p>{note.detail}</p>
                </li>)}
              </ul> : <p>{t.noNotes}</p>}
            </section>
          </div>
          <div>
            <section className="intake-card admin-margin-card" id="marge">
              <h2>{t.margin}</h2>
              <Amount value={record.margin_fcfa} locale={locale} starting={record.kind === "starting_at"} />
              <p>{t.quoteExplanation}</p>
              {record.requires_verification && <span className="verification-badge">{t.verification}</span>}
            </section>
            <section className="case-receipt">
              <h2>{t.quotes}</h2>
              {lines && record.total_fcfa !== null ? (
                <>
                  <Receipt locale={locale} reference={reference} name={record.company_name}
                    capital={Number(record.capital_fcfa ?? 0)} total={Number(record.total_fcfa)} startingAt={record.kind === "starting_at"}
                    rows={lines.map((line) => ({ label: line.label, amountFcfa: line.amountFcfa,
                      annotation: line.verifiedOn ? undefined : t.verification }))} />
                  <details className="admin-quote-sources"><summary>{t.fees}</summary><FeeSources locale={locale} fees={lines} /></details>
                </>
              ) : <p>{t.emptyQuote}</p>}
            </section>
            {record.payment_method && <section className="intake-card">
              <h2>{client.payments}</h2>
              <p>{client.methods[record.payment_method as keyof typeof client.methods]} · {record.payment_status === "paid" ? client.paymentPaid : client.paymentPending}</p>
              {record.payment_method === "manual" && <form className="intake-form" action={setPayment.bind(null, locale, reference, record.payment_status !== "paid")}>
                <button className="button button-outline" type="submit">{record.payment_status === "paid" ? client.reopen : client.markPaid}</button>
              </form>}
            </section>}
          </div>
        </div>
      </main>
    </AdminFrame>
  );
}
