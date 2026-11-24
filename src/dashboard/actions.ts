"use server";

import { redirect } from "next/navigation";
import { authClient } from "../intake/supabase";

export async function authenticate(form: FormData) {
  const client = await authClient();
  if (!client) redirect("/login?message=configuration");
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const signup = form.get("mode") === "signup";
  if (!email || password.length < 8 || password.length > 128) redirect("/login?message=invalid");
  let result;
  try {
    result = signup
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
  } catch {
    redirect("/login?message=unavailable");
  }
  if (result.error) redirect("/login?message=invalid");
  if (!result.data.session) redirect("/login?message=confirmation");
  redirect("/dashboard");
}

export async function logout() {
  const client = await authClient();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) redirect("/dashboard?message=signout_failed");
  }
  redirect("/login");
}
