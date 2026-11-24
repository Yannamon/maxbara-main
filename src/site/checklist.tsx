"use client";

import { useEffect, useState } from "react";
import type { Locale } from "./answers";
import { ChecklistProgress } from "./motion";

const tasks = [
  ["company", "Define your company", "Définir votre société", "Prepare the name, activities, capital, shareholders, managers, expected turnover and contact details.", "Préparez le nom, les activités, le capital, les associés, les dirigeants, le chiffre d’affaires prévisionnel et les coordonnées."],
  ["identity", "Gather identity documents", "Réunir les pièces d’identité", "Provide each manager’s and shareholder’s ID. Add proof of parentage if missing. Corporate shareholders need registration documents, articles and their representative’s ID.", "Joignez la pièce d’identité de chaque dirigeant et associé, avec un justificatif de filiation si nécessaire. Pour un associé personne morale : immatriculation, statuts et identité du représentant."],
  ["record", "Prepare criminal records", "Préparer les casiers judiciaires", "Managers born in the Abidjan Commercial Court jurisdiction need a record less than three months old. Those born outside may submit a signed declaration, then a birthplace criminal record within 75 days of registration.", "Les dirigeants nés dans le ressort du Tribunal de Commerce d’Abidjan fournissent un casier de moins de trois mois. Hors de ce ressort : déclaration sur l’honneur, puis casier du lieu de naissance sous 75 jours après immatriculation."],
  ["articles", "Sign the incorporation documents", "Signer les actes de constitution", "For a private-deed SARL: two signed original articles, two signed original DSV declarations (DRC for contributions in kind), and a certified list of managers. The notarized route has a separate checklist.", "SARL sous seing privé : deux originaux des statuts signés, deux originaux de la DSV signée (DRC pour les apports en nature) et une liste certifiée des dirigeants. La voie notariée a sa propre liste."],
  ["address", "Arrange an address in Côte d’Ivoire", "Prévoir une adresse en Côte d’Ivoire", "Prepare a commercial/professional lease, ownership evidence or domiciliation contract, and a location plan. Confirm the required originals and copies for your route.", "Préparez un bail commercial ou professionnel, un justificatif de propriété ou un contrat de domiciliation, ainsi qu’un plan de localisation. Vérifiez les originaux et copies nécessaires."],
  ["proxy", "Appoint your local representative", "Désigner votre mandataire local", "If applying through a representative, agree their powers and prepare a power of attorney. CEPICI specifies a legalized mandate for collection. Confirm overseas authentication with CEPICI and the Ivorian consulate before signing or sending originals.", "Si vous passez par un mandataire, définissez ses pouvoirs et préparez une procuration. Le CEPICI exige une procuration légalisée pour le retrait. Confirmez l’authentification à l’étranger avec le CEPICI et le consulat ivoirien avant signature ou envoi."],
  ["translation", "Translate and send the originals", "Traduire et transmettre les originaux", "Foreign-language documents need French translations by an approved translator. Confirm who signs each act and which originals must be couriered. A filing mandate does not automatically cover banking or signing articles.", "Les documents en langue étrangère doivent être traduits en français par un traducteur agréé. Confirmez les signataires et les originaux à expédier. Vérifiez séparément les pouvoirs de signature des statuts et les démarches bancaires."],
  ["filing", "Complete the form and submit", "Remplir le formulaire et déposer", "Complete the Personne Morale form, signed by the manager or representative. Relevant acts must be registered and stamped at the Guichet Unique before online submission. Confirm any sector permits and applicable fees.", "Remplissez le formulaire Personne Morale, signé par le dirigeant ou le mandataire. Les actes concernés doivent être enregistrés et timbrés au Guichet Unique avant la mise en ligne. Vérifiez les autorisations sectorielles et frais applicables."],
  ["collect", "Collect and check your registration", "Retirer et vérifier les documents", "Collect the RCCM, tax registration and CNPS employer documents; check the incorporation notice and IDU. Track any outstanding criminal-record deadline. Confirm banking requirements separately.", "Récupérez le RCCM, les documents fiscaux et CNPS employeur ; vérifiez l’annonce de constitution et l’IDU. Suivez le délai de remise du casier judiciaire. Confirmez séparément les exigences bancaires."],
] as const;

export function RegistrationChecklist({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const [done, setDone] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem("maxbara-checklist-v1") ?? "[]");
      if (Array.isArray(value)) setDone(tasks.map(t => t[0]).filter(id => value.includes(id)));
    } catch { /* Progress is optional when storage is unavailable. */ }
    setReady(true);
  }, []);
  function toggle(id: string) {
    const next = done.includes(id) ? done.filter(item => item !== id) : [...done, id];
    setDone(next);
    try { localStorage.setItem("maxbara-checklist-v1", JSON.stringify(next)); } catch { /* Keep the checklist usable. */ }
  }
  const percent = Math.round(done.length / tasks.length * 100);
  return <main className="checklist-page">
    <div className="checklist-scene">
      <div className="checklist-orb" aria-hidden="true" />
      <section className="checklist-card" aria-labelledby="checklist-title">
        <p className="checklist-kicker">{fr ? "ENTREPRENDRE DEPUIS L’ÉTRANGER" : "START A COMPANY FROM ABROAD"}</p>
        <h1 id="checklist-title">{fr ? "Préparez votre création." : "Get ready to register."}</h1>
        <p className="checklist-intro">{fr ? "Votre checklist pour créer une SARL en Côte d’Ivoire, même à distance." : "Your checklist for starting a SARL in Côte d’Ivoire, wherever you live."}</p>
        <p className="checklist-scope">{fr ? "SARL · Capital inférieur à 10 millions FCFA · Sources vérifiées le 24 novembre 2026" : "SARL · Capital below 10 million FCFA · Sources checked 24 November 2026"}</p>
        <div className="checklist-progress"><strong aria-live="polite">{percent}%</strong><ChecklistProgress value={done.length} max={tasks.length} label={fr ? "Progression de la préparation" : "Preparation progress"} /></div>
        <p className="checklist-count">{done.length} / {tasks.length} {fr ? "étapes préparées" : "steps prepared"}</p>
        <div className="checklist-items">{tasks.map(([id, enTitle, frTitle, enDetail, frDetail]) => <div className={`checklist-item${done.includes(id) ? " is-complete" : ""}`} key={id}>
          <input type="checkbox" disabled={!ready} checked={done.includes(id)} onChange={() => toggle(id)} aria-label={`${fr ? "Marquer comme préparé :" : "Mark as prepared:"} ${fr ? frTitle : enTitle}`} />
          <details><summary><span>{fr ? frTitle : enTitle}</span><span className="checklist-expand" aria-hidden="true">+</span></summary><p>{fr ? frDetail : enDetail}</p></details>
        </div>)}</div>
        <p className="checklist-local-note">{fr ? "Progression conservée dans ce navigateur. Cocher une étape ne constitue pas une validation du dossier par le CEPICI." : "Progress saved in this browser. Checking a step does not mean CEPICI has approved your application."}</p>
        <a className="button" href={fr ? "/commencer" : "/en/start"}>{fr ? "Commencer mon dossier" : "Start my application"}</a>
        <aside className="checklist-sources"><h2>{fr ? "Documents officiels et points à confirmer" : "Official documents & final checks"}</h2>
          <p>{fr ? "Confirmez la légalisation depuis votre pays, les pouvoirs du mandataire et l’envoi des originaux avant de déposer. La procédure publiée ne garantit pas un parcours entièrement à distance." : "Confirm authentication from your country, representative powers and delivery of originals before filing. Published guidance does not guarantee an entirely remote process."}</p>
          <a href="https://www.cepici.ci/admin/pdf/codeinvestir/1767864266.pdf">{fr ? "Liste SARL sous seing privé" : "Private-deed SARL checklist"}</a>
          <a href="https://cepici.ci/admin/pdf/codeinvestir/1767862485.pdf">{fr ? "Liste SARL notariée et frais" : "Notarized SARL checklist & fees"}</a>
          <a href="https://www.cepici.ci/index.php/creation-entreprise">{fr ? "Formulaires et autres formes juridiques" : "Forms & other company types"}</a>
          <a href="https://cepici.ci/faq">{fr ? "FAQ du CEPICI" : "CEPICI FAQ"}</a>
          <p>{fr ? "GUFE : Immeuble L’Amiral, 1er étage, Plateau, Abidjan. Tél. +225 25 22 01 79 01." : "GUFE: Immeuble L’Amiral, 1st floor, Plateau, Abidjan. Tel. +225 25 22 01 79 01."} <a href="https://www.cepici.ci/admin/pdf/codeinvestir/1795098951.pdf">{fr ? "Avis de déménagement" : "Relocation notice"}</a></p>
        </aside>
      </section>
    </div>
  </main>;
}
