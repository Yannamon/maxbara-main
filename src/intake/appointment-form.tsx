"use client";

import { useActionState } from "react";
import type { Locale } from "../site/answers";
import { requestAppointment, type AppointmentState } from "./appointment-action";

export function AppointmentForm({ locale, token, email, configured }: { locale: Locale; token: string; email: string; configured: boolean }) {
  const fr = locale === "fr";
  const [state, action, pending] = useActionState(requestAppointment.bind(null, locale, token), {} as AppointmentState);
  if (state.saved) return <div><p className="intake-feedback feedback-success" role="status">{fr ? "Demande enregistrée. Le créneau reste à confirmer par l’équipe ; aucun rendez-vous n’est encore confirmé." : "Request received. The team still needs to confirm your time; no appointment is confirmed yet."}</p>{state.calendarUrl && <a className="button button-outline" href={state.calendarUrl} target="_blank" rel="noreferrer">{fr ? "Ajouter le créneau souhaité à Google Calendar" : "Add preferred time to Google Calendar"}</a>}</div>;
  return <form action={action} className="application-form">
    <p>{fr ? "Indiquez votre créneau préféré et votre fuseau horaire. Ce formulaire demande un rendez-vous ; il ne réserve pas un créneau confirmé." : "Choose a preferred time and timezone. This form requests an appointment; it does not reserve a confirmed slot."}</p>
    {!configured && <p className="intake-feedback" role="status">{fr ? "La prise de rendez-vous est momentanément indisponible." : "Appointment requests are temporarily unavailable."}</p>}
    <div className="application-fields">
      <label className="form-field"><span>{fr ? "Nom et prénom" : "Full name"}</span><input name="name" required maxLength={120} autoComplete="name" /></label>
      <label className="form-field"><span>Email</span><input name="email" type="email" required maxLength={254} defaultValue={email} autoComplete="email" /></label>
      <label className="form-field"><span>{fr ? "Date souhaitée" : "Preferred date"}</span><input name="date" type="date" required /></label>
      <label className="form-field"><span>{fr ? "Heure souhaitée" : "Preferred time"}</span><input name="time" type="time" required /></label>
      <label className="form-field"><span>{fr ? "Fuseau horaire" : "Timezone"}</span><select name="timezone" defaultValue="Africa/Abidjan">{["Africa/Abidjan", "Europe/Paris", "Europe/London", "America/Toronto", "America/New_York", "America/Los_Angeles", "Africa/Dakar", "Africa/Casablanca", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney"].map(zone => <option key={zone}>{zone}</option>)}</select></label>
      <label className="form-field application-wide"><span>{fr ? "Sur quoi souhaitez-vous être accompagné ?" : "What would you like help with?"}</span><textarea name="topic" required maxLength={1500} rows={4} /></label>
    </div>
    {state.error && <p className="intake-feedback" role="alert">{state.error}</p>}
    <button className="button" disabled={pending || !configured}>{pending ? (fr ? "Envoi…" : "Sending…") : (fr ? "Demander ce rendez-vous" : "Request this appointment")}</button>
  </form>;
}
