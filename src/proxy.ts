import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthConfig } from "./config/supabase";

export async function proxy(request: NextRequest) {
  const auth = supabaseAuthConfig();
  if (!auth) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(auth.url, auth.key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(updates, headers) {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of updates) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {})) response.headers.set(name, value);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/commencer", "/en/start", "/rendez-vous", "/en/appointments", "/dossiers/:path*", "/en/cases/:path*", "/admin/:path*", "/en/admin/:path*", "/api/paystack/callback"],
};
