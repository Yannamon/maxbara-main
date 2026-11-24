import type { Locale } from "../site/answers";

export const intakePaths = {
  fr: { list: "/dossiers", start: "/commencer" },
  en: { list: "/en/cases", start: "/en/start" },
};

export function casePath(locale: Locale, reference: string) {
  return `${intakePaths[locale].list}/${encodeURIComponent(reference)}`;
}
