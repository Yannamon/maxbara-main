import { NextResponse } from "next/server";
import { currentUser } from "../../../../../intake/supabase";
import { confirmPaystack } from "../../../../../payments/paystack";
import { casePath } from "../../../../../intake/paths";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "fr" ? "fr" : "en";
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", url));
  let result;
  try { result = await confirmPaystack(url.searchParams.get("reference") ?? "", user.id); }
  catch { return NextResponse.redirect(new URL("/dashboard?message=payment_verification_failed", url)); }
  if (!result) return NextResponse.redirect(new URL("/dashboard", url));
  return NextResponse.redirect(new URL(`${casePath(locale, result.caseReference)}?message=${result.paid ? "payment_updated" : "payment_pending"}#paiement`, url));
}
