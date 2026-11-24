import type { MetadataRoute } from "next";
import { publicSiteOrigin } from "../site/seo.ts";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicSiteOrigin();
  if (!origin) return [];
  return [["/", "/en"], ["/checklist", "/en/checklist"], ["/devis", "/en/quote"]].flatMap(([fr, en]) =>
    [fr, en].map(path => ({ url: `${origin}${path}`, alternates: { languages: { fr: `${origin}${fr}`, en: `${origin}${en}`, "x-default": `${origin}${fr}` } } })));
}
