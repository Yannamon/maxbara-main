import type { Locale } from "../site/answers";
import { documentFields } from "./document-fields";
import { readDocumentDrafts } from "./store";
import { intakeCopy } from "./copy";

export async function DocumentDraftReview({ caseId, locale }: { caseId: string; locale: Locale }) {
  const drafts = await readDocumentDrafts(caseId);
  if (!Object.keys(drafts).length) return null;
  return <section className="intake-card"><h2>{locale === "fr" ? "Brouillons des documents" : "Document drafts"}</h2>
    <p>{locale === "fr" ? "Informations préparatoires ; pièces officielles à vérifier séparément." : "Preparation details; verify official documents separately."}</p>
    {Object.entries(drafts).map(([type, fields]) => <details key={type} className="document-draft-review"><summary>{intakeCopy[locale].document[type as keyof typeof intakeCopy.en.document] ?? type}</summary><dl>
      {(documentFields[type] ?? []).filter(([name]) => fields[name]).map(([name, en, fr]) => <div key={name}><dt>{locale === "fr" ? fr : en}</dt><dd>{fields[name]}</dd></div>)}
    </dl></details>)}
  </section>;
}
