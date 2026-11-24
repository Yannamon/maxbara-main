"use server";

import { revalidatePath } from "next/cache";
import { db, databaseConfigured } from "../server/database";
import { currentUser } from "./supabase";
import type { Locale } from "../site/answers";

export type AppointmentState = { error?: string; saved?: boolean; calendarUrl?: string };

export async function requestAppointment(locale: Locale, token: string, _state: AppointmentState, form: FormData): Promise<AppointmentState> {
  const fr = locale === "fr";
  const user = await currentUser();
  if (!user) return { error: fr ? "Reconnectez-vous pour envoyer la demande." : "Sign in again to send your request." };
  const values = ["name", "email", "date", "time", "timezone", "topic"].map(key => form.get(key));
  if (values.some(value => typeof value !== "string" || !value.trim() || value.length > 1500)) return { error: fr ? "Vérifiez les champs." : "Check all fields." };
  const [name, email, date, time, timezone, topic] = values as string[];
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); }
  catch { return { error: fr ? "Fuseau horaire invalide." : "Invalid timezone." }; }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date <= today
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !/^[0-9a-f-]{36}$/i.test(token)) return { error: fr ? "Choisissez une date future et des coordonnées valides." : "Choose a future date and valid contact details." };
  if (!databaseConfigured()) return { error: fr ? "L’envoi est indisponible. Votre demande n’a pas été enregistrée." : "Requests are currently unavailable. Your request has not been saved." };
  try {
    await db().query(`insert into public.appointment_requests
      (auth_user_id, request_token, contact_name, contact_email, preferred_date, preferred_time, timezone, topic)
      values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (request_token) do nothing`,
    [user.id, token, name.trim(), email.trim(), date, time, timezone, topic.trim()]);
  } catch {
    console.error("Appointment request could not be saved; check connection and appointment migration.");
    return { error: fr ? "La demande n’a pas été enregistrée. Réessayez plus tard." : "Your request could not be saved. Please try again later." };
  }
  revalidatePath("/en/appointments");
  revalidatePath("/rendez-vous");
  const start = new Date(`${date}T${time}:00Z`);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const calendarDate = (value: Date) => value.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const params = new URLSearchParams({ action: "TEMPLATE", text: "Max Bara — appointment request (pending)",
    dates: `${calendarDate(start)}/${calendarDate(end)}`, ctz: timezone,
    details: "Preferred time only. Await confirmation from Max Bara before attending. This calendar entry does not confirm a booking." });
  return { saved: true, calendarUrl: `https://calendar.google.com/calendar/render?${params}` };
}
