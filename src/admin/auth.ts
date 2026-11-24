import "server-only";
import { notFound, redirect } from "next/navigation";
import { db, databaseConfigured } from "../server/database";
import { currentUser } from "../intake/supabase";
import { intakePaths } from "../intake/paths";
import type { Locale } from "../site/answers";

export async function isAdmin(authId: string) {
  if (!databaseConfigured()) return false;
  const { rowCount } = await db().query(
    "select 1 from public.users where auth_user_id = $1 and role = 'admin'", [authId],
  );
  return Boolean(rowCount);
}

export async function adminUser() {
  const user = await currentUser();
  return user && await isAdmin(user.id) ? user : null;
}

export async function requireAdmin(locale: Locale) {
  const user = await currentUser();
  if (!user) redirect(intakePaths[locale].start);
  if (!(await isAdmin(user.id))) notFound();
  return user;
}
