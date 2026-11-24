"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readQuiz, type Locale } from "../site/answers";
import { intakeFlags } from "./documents";
import { ivorianPhone } from "./phone";
import { casePath, intakePaths } from "./paths";
import { authClient, currentUser, pendingPhoneCookie } from "./supabase";
import { choosePayment, createCase, markManualPayment, paymentMethods, submitCase, uploadDocument } from "./store";

function startUrl(locale: Locale, suffix: string, message?: string) {
  const params = new URLSearchParams(suffix);
  if (message) params.set("message", message);
  const query = params.toString();
  return `${intakePaths[locale].start}${query ? `?${query}` : ""}`;
}

function reportCase(locale: Locale, reference: string, message: string, section: string): never {
  const success = ["uploaded", "submitted", "payment_saved", "payment_updated"].includes(message);
  if (success) {
    revalidatePath(casePath("fr", reference));
    revalidatePath(casePath("en", reference));
    if (message === "submitted") {
      revalidatePath(intakePaths.fr.list);
      revalidatePath(intakePaths.en.list);
    }
  }
  const target = success ? section : "feedback";
  redirect(`${casePath(locale, reference)}?message=${message}#${target}`);
}

async function signedIn(locale: Locale) {
  const user = await currentUser();
  if (!user) redirect(intakePaths[locale].start);
  return user;
}

export async function sendOtp(locale: Locale, suffix: string, form: FormData) {
  const jar = await cookies();
  const phone = ivorianPhone(form.get("phone") ?? jar.get(pendingPhoneCookie)?.value);
  if (!phone) redirect(startUrl(locale, suffix, "phone_invalid"));
  const auth = await authClient();
  if (!auth) redirect(startUrl(locale, suffix, "failed"));
  const { error } = await auth.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
  if (error) redirect(startUrl(locale, suffix, "send_failed"));
  jar.set(pendingPhoneCookie, phone, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600,
  });
  redirect(startUrl(locale, suffix, "otp_sent"));
}

export async function verifyOtp(locale: Locale, suffix: string, form: FormData) {
  const jar = await cookies();
  const phone = ivorianPhone(jar.get(pendingPhoneCookie)?.value);
  const token = form.get("code");
  if (!phone || typeof token !== "string" || !/^[0-9]{6}$/.test(token.trim())) {
    redirect(startUrl(locale, suffix, "otp_invalid"));
  }
  const auth = await authClient();
  if (!auth) redirect(startUrl(locale, suffix, "failed"));
  const { data, error } = await auth.auth.verifyOtp({ phone, token: token.trim(), type: "sms" });
  if (error || !data.user) redirect(startUrl(locale, suffix, "otp_invalid"));
  jar.delete(pendingPhoneCookie);
  redirect(startUrl(locale, suffix));
}

export async function resetPhone(locale: Locale, suffix: string) {
  (await cookies()).delete(pendingPhoneCookie);
  redirect(startUrl(locale, suffix));
}

export async function signOut(locale: Locale) {
  const auth = await authClient();
  if (auth) {
    const { error } = await auth.auth.signOut({ scope: "local" });
    if (error) redirect(startUrl(locale, "", "failed"));
  }
  await resetPhone(locale, "");
}

export async function saveCase(locale: Locale, suffix: string, token: string, form: FormData) {
  const user = await signedIn(locale);
  const quiz = readQuiz(Object.fromEntries(new URLSearchParams(suffix)));
  const nameField = form.get("name");
  const companyField = form.get("company");
  const name = typeof nameField === "string" ? nameField.trim() : "";
  const company = typeof companyField === "string" ? companyField.trim() : "";
  if (quiz.state !== "quoted" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(token)
    || !name || !company || name.length > 120 || company.length > 120) {
    redirect(startUrl(locale, suffix, "details_invalid"));
  }

  const flags = Object.fromEntries(
    intakeFlags.map((flag) => [flag, form.get(flag) === "on"]),
  ) as Record<(typeof intakeFlags)[number], boolean>;
  let reference;
  try {
    reference = await createCase(user, locale, token, name, company, quiz, flags);
  } catch (error) {
    console.error("Could not create an application.", error);
    redirect(startUrl(locale, suffix, "failed"));
  }
  revalidatePath(intakePaths.fr.list);
  revalidatePath(intakePaths.en.list);
  redirect(casePath(locale, reference));
}

export async function addFile(locale: Locale, reference: string, type: string, form: FormData) {
  const user = await signedIn(locale);
  const file = [form.get("file"), form.get("photo")].find((value) => value instanceof File && value.size > 0);
  if (!(file instanceof File)) reportCase(locale, reference, "file_size", `doc-${type}`);
  let result;
  try {
    result = await uploadDocument(user, reference, type, file);
  } catch (error) {
    console.error("Could not store an application document.", error);
    result = "failed";
  }
  reportCase(locale, reference, result, `doc-${type}`);
}

export async function sendCase(locale: Locale, reference: string) {
  const user = await signedIn(locale);
  let result;
  try {
    result = await submitCase(user, reference);
  } catch (error) {
    console.error("Could not submit an application.", error);
    result = "failed";
  }
  reportCase(locale, reference, result, result === "files_missing" ? "pieces" : "suivi");
}

export async function savePayment(locale: Locale, reference: string, form: FormData) {
  const user = await signedIn(locale);
  const method = paymentMethods.find((item) => item === "manual" && item === form.get("method"));
  if (!method) reportCase(locale, reference, "unavailable", "paiement");
  let result;
  try {
    result = await choosePayment(user, reference, method);
  } catch (error) {
    console.error("Could not save the payment method.", error);
    result = "failed";
  }
  reportCase(locale, reference, result, "paiement");
}

export async function toggleManualPayment(locale: Locale, reference: string, paid: boolean) {
  const user = await signedIn(locale);
  let result;
  try {
    result = await markManualPayment(user, reference, paid);
  } catch (error) {
    console.error("Could not change the manual payment record.", error);
    result = "failed";
  }
  reportCase(locale, reference, result, "paiement");
}
