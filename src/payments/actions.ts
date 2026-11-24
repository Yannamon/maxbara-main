"use server";

import { redirect } from "next/navigation";
import type { Locale } from "../site/answers";
import { currentUser } from "../intake/supabase";
import { casePath } from "../intake/paths";
import { initializePaystack } from "./paystack";

export async function payWithPaystack(locale: Locale, reference: string, form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const field = form.get("email");
  const email = typeof field === "string" ? field.trim() : user.email;
  let url: string;
  try { url = await initializePaystack(user.id, reference, email, locale); }
  catch {
    console.error("Paystack checkout could not be initialized.");
    redirect(`${casePath(locale, reference)}?message=payment_failed#paiement`);
  }
  redirect(url);
}
