import type { Metadata } from "next";
import type { Locale } from "./answers";

export function publicSiteOrigin(value = process.env.SITE_URL || process.env.APP_URL): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return undefined;
    return url.origin;
  } catch { return undefined; }
}

export function publicPageMetadata(locale: Locale, section: "home" | "checklist" | "quote"): Metadata {
  const pages = {
    home: { fr: "/", en: "/en" },
    checklist: { fr: "/checklist", en: "/en/checklist" },
    quote: { fr: "/devis", en: "/en/quote" },
  };
  const content = {
    fr: {
      home: ["Créer une entreprise en Côte d’Ivoire depuis l’étranger | Max Bara", "Diaspora ivoirienne et investisseurs : préparez votre création d’entreprise en Côte d’Ivoire, estimez les frais et organisez vos démarches à distance."],
      checklist: ["Checklist création d’entreprise : diaspora ivoirienne | Max Bara", "Préparez les pièces d’une SARL en Côte d’Ivoire depuis l’étranger : identité, siège, statuts, procuration, traductions et étapes de revue."],
      quote: ["Coût de création d’entreprise en Côte d’Ivoire | Max Bara", "Estimez votre budget de création de SARL en FCFA : constitution, domiciliation et options. Les projets hors scénario standard nécessitent une étude."],
    },
    en: {
      home: ["Start a Company in Ivory Coast from Abroad | Max Bara", "Company formation in Côte d’Ivoire (Ivory Coast) for Ivorians abroad and international investors. Prepare documents, estimate costs and plan local representation."],
      checklist: ["Ivory Coast Company Registration Checklist | Max Bara", "Prepare a SARL application in Côte d’Ivoire from abroad: identity documents, registered office, articles, power of attorney, translations and review steps."],
      quote: ["Company Formation Costs in Ivory Coast | Max Bara", "Estimate SARL formation costs in Côte d’Ivoire in FCFA, including registered-address and notary options. Other projects require individual pricing review."],
    },
  };
  const [title, description] = content[locale][section];
  const origin = publicSiteOrigin();
  const pair = pages[section];
  return {
    title, description, robots: { index: true, follow: true },
    ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: `${origin}${pair[locale]}`,
      languages: { fr: `${origin}${pair.fr}`, en: `${origin}${pair.en}`, "x-default": `${origin}${pair.fr}` } } } : {}),
    openGraph: { type: "website", title, description, siteName: "Max Bara", locale: locale === "fr" ? "fr_CI" : "en_GB",
      alternateLocale: locale === "fr" ? "en_GB" : "fr_CI", ...(origin ? { url: `${origin}${pair[locale]}` } : {}) },
    twitter: { card: "summary", title, description },
  };
}
