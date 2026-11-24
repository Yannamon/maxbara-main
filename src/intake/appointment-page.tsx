import { randomUUID } from "node:crypto";
import { SiteFrame } from "../site/frame";
import type { Locale } from "../site/answers";
import { db, databaseConfigured } from "../server/database";
import { currentUser } from "./supabase";
import { isAdmin } from "../admin/auth";
import { AppointmentForm } from "./appointment-form";

export async function AppointmentPage({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const user = await currentUser();
  let requests: { id: string; contact_name: string; contact_email: string; date: string; time: string; timezone: string; topic: string; status: string }[] = [];
  let admin = false;
  let historyUnavailable = false;
  if (user && databaseConfigured()) {
    try {
      admin = await isAdmin(user.id);
      const result = await db().query(`select id, contact_name, contact_email, preferred_date::text as date,
        preferred_time::text as time, timezone, topic, status from public.appointment_requests
        where auth_user_id = $1 or $2::boolean order by created_at desc limit 50`, [user.id, admin]);
      requests = result.rows;
    } catch { historyUnavailable = true; }
  }
  const booking = process.env.APPOINTMENT_BOOKING_URL;
  const bookingUrl = booking && /^https:\/\//i.test(booking) ? booking : null;
  return <SiteFrame locale={locale} alternateHref={fr ? "/en/appointments" : "/rendez-vous"}>
    <main className="shell intake-main application-start"><section className="intake-card"><p className="eyebrow">{fr ? "UN CONSEILLER À VOS CÔTÉS" : "A LITTLE HELP, A CLEARER PATH"}</p><h1>{fr ? "Prenons le temps d’en parler." : "Let’s talk it through."}</h1>
      <p>{fr ? "Documents, procuration, domiciliation ou création depuis l’étranger : préparez votre projet avec un accompagnement adapté." : "Get help with documents, representation, a registered address, or starting your company from abroad."}</p>
      {bookingUrl ? <a className="button" href={bookingUrl} target="_blank" rel="noreferrer">{fr ? "Choisir un créneau" : "Choose an appointment time"}</a>
        : user ? <AppointmentForm locale={locale} token={randomUUID()} email={user.email} configured={databaseConfigured() && !historyUnavailable} />
        : <a className="button" href="/login">{fr ? "Se connecter pour demander un rendez-vous" : "Sign in to request an appointment"}</a>}
    </section>
    {user && <section className="intake-card"><h2>{admin ? (fr ? "Demandes de rendez-vous" : "Appointment requests") : (fr ? "Mes demandes" : "My requests")}</h2>
      {historyUnavailable ? <p>{fr ? "Les demandes sont indisponibles pour le moment." : "Requests are currently unavailable."}</p> : !requests.length ? <p>{fr ? "Aucune demande enregistrée." : "No requests saved yet."}</p> : requests.map(request => <article className="appointment-request" key={request.id}>
        <h3>{request.date} · {request.time.slice(0, 5)} · {request.timezone}</h3><p>{fr ? "Statut" : "Status"}: {request.status}</p><p>{request.topic}</p>{admin && <p>{request.contact_name} · {request.contact_email}</p>}
      </article>)}
    </section>}
    </main>
  </SiteFrame>;
}
