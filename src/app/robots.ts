import type { MetadataRoute } from "next";
import { publicSiteOrigin } from "../site/seo.ts";

export default function robots(): MetadataRoute.Robots {
  const origin = publicSiteOrigin();
  if (!origin) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/login", "/dashboard", "/admin", "/en/admin", "/dossiers", "/en/cases", "/commencer", "/en/start", "/rendez-vous", "/en/appointments", "/api/"] }, sitemap: `${origin}/sitemap.xml` };
}
