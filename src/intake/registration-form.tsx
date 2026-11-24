"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import type { Locale, QuizAnswers } from "../site/answers";
import { saveRegistration } from "./registration-action";
import { intakeFlags } from "./documents";
import { intakeCopy } from "./copy";
import type { ApplicationState } from "./registration";

export function RegistrationForm({ locale, token, answers, email, configured }: {
  locale: Locale; token: string; answers: QuizAnswers; email: string; configured: boolean;
}) {
  const fr = locale === "fr";
  const text = (en: string, french: string) => fr ? french : en;
  const [state, action, pending] = useActionState(saveRegistration.bind(null, locale, token), {} as ApplicationState);
  const [representative, setRepresentative] = useState(false);
  const [address, setAddress] = useState(answers.address);
  const [values, setValues] = useState<Record<string, string>>({ ...answers, email });
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  function field(name: string) {
    return { value: values[name] ?? "", onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues(previous => ({ ...previous, [name]: event.target.value }));
    } };
  }
  function input(name: string, label: string, type = "text", required = true, hint?: string) {
    return <label className="form-field"><span>{label}{!required && ` (${text("optional", "facultatif")})`}</span>
      <input name={name} type={type} required={required} maxLength={name === "email" ? 254 : name === "name" || name === "company" ? 120 : 3000}
        {...field(name)} min={type === "number" ? 0 : undefined} max={name === "employees" ? 999999 : type === "number" ? 999999999999999 : undefined} step={type === "number" ? 1 : undefined} />
      {hint && <small>{hint}</small>}</label>;
  }
  function area(name: string, label: string, hint: string, required = true) {
    return <label className="form-field application-wide"><span>{label}</span><textarea name={name} required={required} maxLength={3000} rows={4} {...field(name)} /><small>{hint}</small></label>;
  }
  return <form action={action} className="application-form">
    <p>{text("Complete the details below to save a draft. Upload your identity and company documents securely after saving; do not enter passport numbers here.", "Complétez ces informations pour enregistrer un brouillon. Les pièces d’identité et documents seront déposés de façon sécurisée après l’enregistrement ; ne saisissez pas de numéro de passeport ici.")}</p>
    {!configured && <p className="intake-feedback" role="status">{text("Saving is temporarily unavailable. You can explore this form, but your answers cannot be saved until the service is connected. Keep this page open.", "L’enregistrement est momentanément indisponible. Vous pouvez consulter le formulaire, mais vos réponses ne pourront être enregistrées qu’une fois le service connecté. Gardez cette page ouverte.")}</p>}
    <fieldset><legend>{text("Your contact details", "Vos coordonnées")}</legend><div className="application-fields">
      {input("name", text("Full name", "Nom et prénom"))}{input("email", "Email", "email")}
      {input("contactPhone", text("Phone with country code", "Téléphone avec indicatif"), "tel")}{input("country", text("Country of residence", "Pays de résidence"))}
    </div></fieldset>
    <fieldset><legend>{text("Company and activities", "Société et activités")}</legend><div className="application-fields">
      {input("company", text("Proposed company name", "Dénomination souhaitée"))}
      <label className="form-field"><span>{text("Legal form", "Forme juridique")}</span><select name="form" {...field("form")}>{["SARL", "SAS", "SA", "other"].map(value => <option key={value} value={value}>{value === "other" ? text("Other / advice needed", "Autre / conseil nécessaire") : value}</option>)}</select></label>
      <label className="form-field"><span>{text("Capital (FCFA)", "Capital (FCFA)")}</span><input name="capital" type="number" min={1} max={999999999999999} step={1} {...field("capital")} required /></label>
      <label className="form-field"><span>{text("Sector", "Secteur")}</span><select name="sector" {...field("sector")}>{Object.entries({ services: text("Services", "Services"), commerce: text("Commerce", "Commerce"), technology: text("Technology", "Technologie"), industry: text("Industry", "Industrie"), agriculture: text("Agriculture", "Agriculture"), other: text("Other", "Autre") }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {area("activity", text("Main and secondary activities", "Activités principales et secondaires"), text("Describe what the company will sell or provide and when you plan to start.", "Décrivez les produits ou services et le démarrage prévu."))}
      {input("turnover", text("Expected annual turnover (FCFA)", "Chiffre d’affaires annuel prévisionnel (FCFA)"), "number")}
      {input("employees", text("Expected employee count", "Nombre de salariés prévu"), "number")}
      <label className="form-field"><span>{text("Package", "Forfait")}</span><select name="package" {...field("package")}>{["essentiel", "serenite", "diaspora", "agrement"].map(plan => <option key={plan} value={plan}>{plan}</option>)}</select></label>
      <label className="form-field"><span>{text("Incorporation documents", "Actes de constitution")}</span><select name="statutes" {...field("statutes")}><option value="private">{text("Private deed", "Sous seing privé")}</option><option value="notarized">{text("Notarized", "Notariés")}</option></select></label>
      <label className="form-field"><span>{text("Import/export activity?", "Activité import-export ?")}</span><select name="trade" {...field("trade")}><option value="no">{text("No", "Non")}</option><option value="yes">{text("Yes", "Oui")}</option></select></label>
    </div><p>{text("Projects outside the standard SARL pricing scenario are saved for review, without an automatic price.", "Les projets hors du scénario tarifaire SARL sont enregistrés pour étude, sans prix automatique.")}</p></fieldset>
    <fieldset><legend>{text("Shareholders and managers", "Associés et dirigeants")}</legend><div className="application-fields">
      {area("shareholders", text("Shareholders and contributions", "Associés et apports"), text("One per line: full name or company name, nationality/country, ownership percentage, cash or in-kind contribution. Identify any corporate shareholder.", "Une ligne par associé : nom ou société, nationalité/pays, pourcentage du capital et apport en numéraire ou en nature. Identifiez les associés personnes morales."))}
      {area("managers", text("Managers and signatories", "Dirigeants et signataires"), text("One per line: name, role, nationality, date/place of birth and residential address. Indicate whether the identity document shows parentage.", "Une ligne par dirigeant : nom, fonction, nationalité, date/lieu de naissance et domicile. Indiquez si la filiation figure sur la pièce d’identité."))}
    </div></fieldset>
    <fieldset><legend>{text("Registered office", "Siège social")}</legend><div className="application-fields">
      <label className="form-field"><span>{text("Do you already have an address in Côte d’Ivoire?", "Avez-vous déjà une adresse en Côte d’Ivoire ?")}</span><select name="address" value={address} onChange={event => setAddress(event.target.value as "yes" | "no")}><option value="yes">{text("Yes — lease, ownership or domiciliation", "Oui — bail, propriété ou domiciliation")}</option><option value="no">{text("No — I need domiciliation", "Non — je souhaite une domiciliation")}</option></select></label>
      {area("registeredAddress", text("Address and premises evidence", "Adresse et justificatif du siège"), text("City, commune, district, street and building; state whether you have a lease, ownership document or domiciliation contract. A location plan will be requested after saving.", "Ville, commune, quartier, rue et immeuble ; précisez le justificatif disponible : bail, propriété ou domiciliation. Un plan de localisation sera demandé après l’enregistrement."), address === "yes")}
    </div></fieldset>
    <fieldset><legend>{text("Documents and local representation", "Pièces et représentation locale")}</legend>
      <div className="intake-flags">{intakeFlags.map(flag => <label key={flag}><input type="checkbox" name={flag} checked={flag === "representative" ? representative : flags[flag] ?? false} onChange={event => { setFlags(previous => ({ ...previous, [flag]: event.target.checked })); if (flag === "representative") setRepresentative(event.target.checked); }} /><span>{intakeCopy[locale].flags[flag]}</span></label>)}</div>
      {representative && <div className="application-fields">{input("representativeName", text("Representative’s full name", "Nom du mandataire"))}{input("representativeContact", text("Representative’s email / phone", "Email / téléphone du mandataire"))}</div>}
      {!representative && <><input type="hidden" name="representativeName" value="" /><input type="hidden" name="representativeContact" value="" /></>}
      <p>{text("From abroad: confirm power-of-attorney authentication with CEPICI and the Ivorian consulate. Foreign-language documents require an approved French translation. Original signed documents may need delivery.", "Depuis l’étranger : confirmez l’authentification de la procuration avec le CEPICI et le consulat ivoirien. Les documents étrangers nécessitent une traduction agréée en français. Prévoyez l’envoi des originaux signés.")}</p>
      {area("notes", text("Questions or extra support needed", "Questions ou accompagnement souhaité"), text("Tell us about any missing documents or assistance you need.", "Indiquez les documents manquants et vos besoins d’accompagnement."), false)}
    </fieldset>
    {state.error && <p className="intake-feedback" role="alert">{state.error}</p>}
    <div className="application-actions"><button className="button" disabled={pending || !configured}>{pending ? text("Saving…", "Enregistrement…") : text("Save my application", "Enregistrer mon dossier")}</button><a className="button button-outline" href={fr ? "/rendez-vous" : "/en/appointments"}>{text("Book an appointment", "Prendre rendez-vous")}</a></div>
    <p><a className="text-action" href={fr ? "/checklist" : "/en/checklist"} target="_blank" rel="noreferrer">{text("View the full preparation checklist", "Consulter la checklist complète")}</a></p>
  </form>;
}
