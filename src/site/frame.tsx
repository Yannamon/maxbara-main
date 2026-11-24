import type { ReactNode } from "react";
import { copy, otherLocale, paths } from "./copy";
import type { Locale } from "./answers";
import { intakeCopy } from "../intake/copy";
import { intakePaths } from "../intake/paths";

export function SiteHeader({
  locale,
  section = "home",
  suffix = "",
  alternateHref,
}: {
  locale: Locale;
  section?: "home" | "quote" | "start";
  suffix?: string;
  alternateHref?: string;
}) {
  const t = copy[locale];
  const alternate = otherLocale(locale);
  const home = paths[locale].home;

  return (
    <header className="site-header">
      <div className="shell header-row">
        <a className="wordmark" href={home} aria-label={`Max Bara — ${t.home}`}>
          <span className="brand-logo" aria-hidden="true"><img src="/maxbaralogo.png" alt="" width={1024} height={1024} /></span>
          Max Bara<span className="brand-period" aria-hidden="true">.</span>
        </a>
        <nav className="header-nav" aria-label={t.nav.label}>
          <a href={`${home}#services`}>{t.nav.services}</a>
          <a href={`${home}#tarifs`}>{t.nav.pricing}</a>
          <a href={locale === "fr" ? "/checklist" : "/en/checklist"}>Checklist</a>
          <a href={locale === "fr" ? "/rendez-vous" : "/en/appointments"}>{locale === "fr" ? "Rendez-vous" : "Book an appointment"}</a>
          <a href="/dashboard">{intakeCopy[locale].account}</a>
        </nav>
        <div className="header-actions">
          <div className="language-switch" aria-label={locale === "fr" ? "Langue" : "Language"}>
            <span aria-current="true">{locale.toUpperCase()}</span>
            <a href={alternateHref ?? `${paths[alternate][section]}${suffix}${section === "quote" && suffix.includes("estimate=1") ? "#resultat" : ""}`}
              lang={alternate} hrefLang={alternate} aria-label={alternate === "en" ? "English" : "Français"}>
              {alternate.toUpperCase()}
            </a>
          </div>
          <a className="button button-small desktop-cta" href={`${home}#devis`}>{t.nav.estimate}</a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const home = paths[locale].home;
  return (
    <footer className="site-footer">
      <div className="shell footer-row">
        <div><a className="footer-brand" href={home}><span className="brand-logo" aria-hidden="true"><img src="/maxbaralogo.png" alt="" width={1024} height={1024} /></span>Max Bara.</a><p>{t.footer}</p></div>
        <nav aria-label={locale === "fr" ? "Pied de page" : "Footer"}>
          <a href={`${home}#services`}>{t.nav.services}</a>
          <a href={`${home}#tarifs`}>{t.nav.pricing}</a>
          <a href={`${home}#devis`}>{t.nav.estimate}</a>
          <a href={intakePaths[locale].list}>{intakeCopy[locale].account}</a>
        </nav>
      </div>
    </footer>
  );
}

export function SiteFrame({
  locale,
  children,
  section,
  suffix,
  alternateHref,
}: {
  locale: Locale;
  children: ReactNode;
  section?: "quote" | "start";
  suffix?: string;
  alternateHref?: string;
}) {
  return (
    <>
      <SiteHeader locale={locale} section={section} suffix={suffix} alternateHref={alternateHref} />
      {children}
      <SiteFooter locale={locale} />
    </>
  );
}
