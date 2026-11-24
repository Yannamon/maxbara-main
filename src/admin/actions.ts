"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { casePath, intakePaths } from "../intake/paths";
import { markManualPayment } from "../intake/store";
import type { Locale } from "../site/answers";
import { requireAdmin } from "./auth";
import { adminPath, referencePattern, statuses, uuidPattern, validExpectedDate } from "./model";
import { addInternalNote, completeReview, setProgress } from "./store";

function finish(locale: Locale, reference: string, message: string): never {
  if (message === "saved") {
    for (const language of ["fr", "en"] as const) {
      revalidatePath(adminPath(language));
      revalidatePath(adminPath(language, reference));
      revalidatePath(casePath(language, reference));
      revalidatePath(intakePaths[language].list);
    }
  }
  redirect(`${adminPath(locale, reference)}?message=${message}#feedback`);
}

async function mutate(locale: Locale, reference: string, operation: (user: Awaited<ReturnType<typeof requireAdmin>>) => Promise<boolean>) {
  if (!referencePattern.test(reference)) notFound();
  const user = await requireAdmin(locale);
  let updated;
  try {
    updated = await operation(user);
  } catch (error) {
    console.error("An administrative case update failed.", error);
  }
  finish(locale, reference, updated ? "saved" : "unavailable");
}

export async function updateProgress(locale: Locale, reference: string, form: FormData) {
  await mutate(locale, reference, async (user) => {
    const status = statuses.find((value) => value === form.get("status"));
    const next = form.get("next");
    const date = form.get("date");
    if (!status || typeof next !== "string" || next.trim().length > 400
      || typeof date !== "string" || (date && !validExpectedDate(date))) return false;
    return setProgress(user.id, reference, status, next.trim() || null, date || null);
  });
}

export async function recordReview(locale: Locale, reference: string) {
  await mutate(locale, reference, (user) => completeReview(user.id, reference));
}

export async function saveNote(locale: Locale, reference: string, token: string, form: FormData) {
  await mutate(locale, reference, (user) => {
    const detail = form.get("note");
    if (typeof detail !== "string" || !detail.trim() || detail.trim().length > 2000 || !uuidPattern.test(token)) {
      return Promise.resolve(false);
    }
    return addInternalNote(user.id, reference, detail.trim(), token);
  });
}

export async function setPayment(locale: Locale, reference: string, paid: boolean) {
  await mutate(locale, reference, async (user) => await markManualPayment(user, reference, paid) === "payment_updated");
}
