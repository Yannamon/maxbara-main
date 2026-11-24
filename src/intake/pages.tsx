import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "../admin/auth";
import { adminPath } from "../admin/model";
import { adminCopy } from "../admin/copy";
import { readQuiz, type Locale, type Query } from "../site/answers";
import { copy, money, otherLocale, paths } from "../site/copy";
import { SiteFrame } from "../site/frame";
import { Receipt } from "../site/receipt";
import { addFile, resetPhone, savePayment, sendCase, sendOtp, signOut, toggleManualPayment, verifyOtp } from "./actions";
import { intakeCopy } from "./copy";
import { checklist, checklistSource } from "./documents";
import { casePath, intakePaths } from "./paths";
import { ivorianPhone } from "./phone";
import { intakeDatabaseConfigured, listCases, readCase, readDocuments, readDocumentDrafts } from "./store";
import { authConfig, currentUser, pendingPhoneCookie } from "./supabase";
import { UploadPicker } from "./upload-picker";
import { RegistrationSummary } from "./registration-summary";
import { RegistrationForm } from "./registration-form";
import { DocumentModal } from "./document-modal";
import { paystackConfig } from "../payments/paystack";
import { payWithPaystack } from "../payments/actions";
import { marketing } from "../site/marketing";

type RecordDetails = NonNullable<Awaited<ReturnType<typeof readCase>>>;

function Feedback({ locale, code }: { locale: Locale; code: Query[string] }) {
  const messages = intakeCopy[locale].messages;
  if (typeof code !== "string" || !Object.hasOwn(messages, code)) return null;
  const positive = ["otp_sent", "uploaded", "submitted", "payment_saved", "payment_updated"].includes(code);
  return <p id="feedback" tabIndex={-1} className={`intake-feedback${positive ? " feedback-success" : ""}`} role={positive ? "status" : "alert"}>
    {messages[code as keyof typeof messages]}
  </p>;
}

export async function IntakeStart({ locale, query }: { locale: Locale; query: Promise<Query> }) {
  const params = await query;
  const quiz = readQuiz(params);
  const t = intakeCopy[locale];
  const ready = Boolean(authConfig());
  const user = ready ? await currentUser() : null;

  const phone = ready && !user ? ivorianPhone((await cookies()).get(pendingPhoneCookie)?.value) : null;
  const back = quiz.suffix ? `${paths[locale].quote}${quiz.suffix}#resultat` : `${paths[locale].home}#devis`;

  return (
    <SiteFrame locale={locale} section="start" suffix={quiz.suffix}>
      <main className="shell handoff intake-start application-start">
        <section className="intake-card">
          {quiz.state === "quoted" && <p className="eyebrow">{quiz.reference}</p>}
          <h1>{t.start}</h1>
          <Feedback locale={locale} code={params.message} />
          {!ready ? (
            <p>{t.unavailable}</p>
          ) : user ? (
            <RegistrationForm locale={locale} token={randomUUID()} answers={quiz.answers} email={user.email} configured={intakeDatabaseConfigured()} />
          ) : phone ? (
            <>
              <p>{t.sentTo} •••• {phone.slice(-4)}.</p>
              <form className="intake-form" action={verifyOtp.bind(null, locale, quiz.suffix)}>
                <label className="form-field"><span>{t.otp}</span>
                  <input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
                </label>
                <button className="button" type="submit">{t.verify}</button>
              </form>
              <div className="intake-link-row">
                <form action={sendOtp.bind(null, locale, quiz.suffix)}><button className="text-action">{t.resend}</button></form>
                <form action={resetPhone.bind(null, locale, quiz.suffix)}><button className="text-action">{t.change}</button></form>
              </div>
            </>
          ) : (
            <>
              <p>{t.loginHint}</p><a className="text-action" href="/login">{locale === "fr" ? "Connexion par email" : "Sign in with email"}</a>
              <form className="intake-form" action={sendOtp.bind(null, locale, quiz.suffix)}>
                <label className="form-field"><span>{t.phone}</span>
                  <input name="phone" type="tel" autoComplete="tel" placeholder="+225" maxLength={25} required />
                </label>
                <button className="button" type="submit">{t.send}</button>
              </form>
            </>
          )}
          <a className="text-action" href={back}>{quiz.suffix ? t.backToQuote : t.newQuote}</a><a className="text-action" href={locale === "fr" ? "/rendez-vous" : "/en/appointments"}>{locale === "fr" ? "Prendre rendez-vous" : "Book an appointment"}</a>
        </section>
      </main>
    </SiteFrame>
  );
}

export async function Applications({ locale }: { locale: Locale }) {
  const user = await currentUser();
  if (!user || !intakeDatabaseConfigured()) redirect(intakePaths[locale].start);
  const t = intakeCopy[locale];
  const [records, canAdminister] = await Promise.all([listCases(user), isAdmin(user.id)]);
  const home = `${paths[locale].home}#devis`;

  return (
    <SiteFrame locale={locale} alternateHref={intakePaths[otherLocale(locale)].list}>
      <main className="shell intake-main">
        <header className="portal-heading"><h1>{t.account}</h1><SignOut locale={locale} /></header>
        <div className="cases-list">
          {records.length ? records.map((record) => (
            <a className="intake-card case-link" key={record.reference} href={casePath(locale, record.reference)}>
              <div><p className="eyebrow">{record.reference}</p><h2>{record.company_name}</h2></div>
              <span className="case-status">{t.status[record.status]}</span>
            </a>
          )) : <p>{t.empty}</p>}
        </div>
        <div className="header-actions">
          <a className="button" href={home}>{t.newQuote}</a>
          {canAdminister && <a className="button button-outline" href={adminPath(locale)}>{adminCopy[locale].title}</a>}
        </div>
      </main>
    </SiteFrame>
  );
}

function SignOut({ locale }: { locale: Locale }) {
  return <form action={signOut.bind(null, locale)}>
    <button type="submit" className="text-action">{intakeCopy[locale].signOut}</button>
  </form>;
}

function Payment({ locale, record }: { locale: Locale; record: RecordDetails }) {
  const t = intakeCopy[locale];
  const isPaid = record.payment_status === "paid";
  return (
    <section className="intake-card" id="paiement">
      <h2>{record.is_owner ? t.payments : t.staff}</h2>
      {record.is_owner && record.status === "draft" && <p>{locale === "fr" ? "Le paiement n’est pas requis pour envoyer le dossier en revue. Confirmez les frais avec l’équipe avant de régler." : "Payment is not required to send your application for review. Confirm the fees with the team before paying."}</p>}
      {record.payment_method && (
        <p className="payment-state">{t.methods[record.payment_method]} · {isPaid ? t.paymentPaid : t.paymentPending}</p>
      )}
      {record.kind === "starting_at" && <p>{t.startingNote}</p>}
      {record.is_owner && record.kind === "estimate" && !isPaid && record.status !== "delivered" && (
        <>
          <form className="intake-form" action={savePayment.bind(null, locale, record.reference)}>
            <label className="form-field select-field"><span>{t.methodLabel}</span>
              <input type="hidden" name="method" value="manual" />
              <span>{t.methods.manual}</span>
            </label>
            <p>{t.manualNote}</p>
            <button type="submit" className="button button-outline" disabled={record.payment_method === "paystack"}>{t.saveMethod}</button>
          </form>
          <form className="intake-form" action={payWithPaystack.bind(null, locale, record.reference)}>
            <label className="form-field"><span>{locale === "fr" ? "Email pour le reçu" : "Receipt email"}</span><input name="email" type="email" required maxLength={254} defaultValue={record.intake?.details?.email ?? ""} autoComplete="email" /></label>
            <p>{locale === "fr" ? "Réglez sur la page sécurisée Paystack. Les moyens disponibles dépendent de votre compte et de votre pays." : "Pay on Paystack’s secure checkout. Available payment methods depend on your account and country."}</p>
            {!paystackConfig() && <p role="status">{locale === "fr" ? "Le paiement en ligne sera disponible prochainement." : "Online payment is not available yet."}</p>}
            {paystackConfig()?.mode === "test" && <p>{locale === "fr" ? "Mode test : aucun paiement réel." : "Test mode: no real payment."}</p>}
            <button className="button" disabled={!paystackConfig()}>{locale === "fr" ? "Payer avec Paystack" : "Pay with Paystack"}</button>
          </form>
        </>
      )}
      {record.is_admin && record.payment_method === "manual" && (
        <form className="intake-form" action={toggleManualPayment.bind(null, locale, record.reference, !isPaid)}>
          <button type="submit" className="button">{isPaid ? t.reopen : t.markPaid}</button>
        </form>
      )}
      {!record.is_owner && record.payment_method !== "manual" && <p>{t.messages.unavailable}</p>}
    </section>
  );
}

export async function Application({
  locale, reference, query,
}: { locale: Locale; reference: string; query: Promise<Query> }) {
  if (!/^MB-[A-Z0-9-]{1,30}$/.test(reference)) notFound();
  const user = await currentUser();
  if (!user || !intakeDatabaseConfigured()) redirect(intakePaths[locale].start);
  const [record, params] = await Promise.all([readCase(user, reference), query]);
  if (!record) notFound();
  const t = intakeCopy[locale];
  const site = copy[locale];
  const uploads = record.is_owner && record.intake ? await readDocuments(record.id) : [];
  const drafts = record.is_owner && record.intake ? await readDocumentDrafts(record.id) : {};
  const date = record.expected_date
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-CI" : "en-GB", { dateStyle: "long", timeZone: "UTC" })
      .format(new Date(`${record.expected_date}T00:00:00Z`))
    : t.unknownDate;

  return (
    <SiteFrame locale={locale} alternateHref={casePath(otherLocale(locale), reference)}>
      <main className="shell intake-main">
        <header className="portal-heading">
          <div><a className="text-action" href={intakePaths[locale].list}>{t.account}</a><h1>{record.company_name}</h1></div>
          <SignOut locale={locale} />
        </header>
        <Feedback locale={locale} code={params.message} />
        <section className="intake-card case-summary" id="suivi">
          <div className="case-heading"><p className="eyebrow">{reference}</p><span className="case-status">{t.status[record.status]}</span></div>
          <dl>
            <div><dt>{t.next}</dt><dd>{record.next_step || { draft: t.nextDraft, submitted: t.nextSubmitted, delivered: t.nextDelivered }[record.status]}</dd></div>
            <div><dt>{t.date}</dt><dd>{date}</dd></div>
          </dl>
        </section>
        <div className={`intake-case-grid${record.is_owner && record.intake ? "" : " intake-case-single"}`}>
          <div className="intake-case-files">
            <RegistrationSummary locale={locale} details={record.intake?.details} />
            {!record.quote_id && <p className="intake-card">{locale === "fr" ? "Votre projet nécessite une étude tarifaire. Un devis doit être confirmé par l’équipe." : "Your project needs a pricing review. The team must confirm a quote."}</p>}
            {record.is_owner && record.intake && (
              <section className="intake-card" id="pieces">
                <h2>{t.docs}</h2>
                <aside className="review-payment-note"><h3>{marketing[locale].reviewTitle}</h3><p>{marketing[locale].reviewNote}</p></aside>
                <p>{t.docsHint}</p>
                <a className="text-action" href={checklistSource} rel="noreferrer">{t.docsSource}</a>
                <ul className="documents-list">
                  {checklist(record.intake).map((item) => {
                    const notarized = record.intake?.answers.statutes === "notarized";
                    const label = notarized && (item.id === "statutes" || item.id === "subscription")
                      ? `${item.id}Notary` : item.id;
                    const files = uploads.filter((file) => file.document_type === item.id);
                    return (
                      <li id={`doc-${item.id}`} key={item.id}>
                        <div className="document-title">
                          <h3>{t.document[label as keyof typeof t.document]}</h3>
                          <span>{files.length ? t.received : item.required ? t.required : t.optional}</span>
                        </div>
                        {!!files.length && <ul className="document-names">{files.map((file, index) =>
                          <li key={`${index}-${file.original_filename}`}>{file.original_filename}</li>)}</ul>}
                        {record.status === "draft" && (
                          item.id === "identity" ? <UploadPicker key={files.length} action={addFile.bind(null, locale, reference, item.id)}
                            labels={{ file: t.file, camera: t.camera, upload: t.upload, uploading: t.uploading, size: t.messages.file_size }} />
                          : <DocumentModal locale={locale} reference={reference} type={item.id} title={t.document[label as keyof typeof t.document]} draft={drafts[item.id] ?? {}}>
                            <UploadPicker key={files.length} action={addFile.bind(null, locale, reference, item.id)} labels={{ file: t.file, camera: t.camera, upload: t.upload, uploading: t.uploading, size: t.messages.file_size }} />
                          </DocumentModal>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {record.status === "draft" && <form action={sendCase.bind(null, locale, reference)}>
                  <button type="submit" className="button">{t.sendCase}</button>
                </form>}
              </section>
            )}
          </div>
          <aside className="intake-case-aside">
            {record.lines && record.total_fcfa && record.package && (
              <section className="case-receipt">
                <h2>{t.quote}</h2>
                <Receipt locale={locale} reference={reference} name={`${record.legal_form} · ${site.packages[record.package]}`}
                  capital={Number(record.capital_fcfa)} total={Number(record.total_fcfa)} startingAt={record.kind === "starting_at"}
                  rows={record.lines.map((line) => ({ label: site.lines[line.code] ?? line.label, amountFcfa: line.amountFcfa }))} />
                {record.is_owner && <p>{site.receipt.notice}</p>}
              </section>
            )}
            {record.quote_id && <Payment locale={locale} record={record} />}
          </aside>
        </div>
      </main>
    </SiteFrame>
  );
}
