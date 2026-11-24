import type { Locale } from "../site/answers";
import type { RegistrationDetails } from "./registration";

const labels: Record<keyof RegistrationDetails, [string, string]> = {
  name: ["Applicant", "Demandeur"], email: ["Email", "Email"], contactPhone: ["Contact phone", "Téléphone de contact"], country: ["Country of residence", "Pays de résidence"],
  company: ["Company", "Société"], activity: ["Activities", "Activités"], turnover: ["Expected annual turnover (FCFA)", "CA annuel prévisionnel (FCFA)"], employees: ["Expected employees", "Salariés prévus"],
  registeredAddress: ["Registered address", "Siège social"], shareholders: ["Shareholders and contributions", "Associés et apports"], managers: ["Managers", "Dirigeants"],
  representativeName: ["Representative", "Mandataire"], representativeContact: ["Representative contact", "Coordonnées du mandataire"], notes: ["Support needed", "Accompagnement souhaité"],
};

export function RegistrationSummary({ details, locale }: { details?: RegistrationDetails; locale: Locale }) {
  if (!details) return null;
  return <section className="intake-card"><h2>{locale === "fr" ? "Informations du dossier" : "Application details"}</h2><dl className="registration-summary">
    {(Object.keys(labels) as (keyof RegistrationDetails)[]).filter(key => details[key]).map(key => <div key={key}><dt>{labels[key][locale === "fr" ? 1 : 0]}</dt><dd>{details[key]}</dd></div>)}
  </dl></section>;
}
