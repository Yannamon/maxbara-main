"use client";

import { useActionState, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "../site/answers";
import { documentFields } from "./document-fields";
import { saveDocumentDraft, type DocumentState } from "./document-action";

export function DocumentModal({ locale, reference, type, title, draft, children }: {
  locale: Locale; reference: string; type: string; title: string; draft: Record<string, string>; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const id = useId();
  const fr = locale === "fr";
  const [values, setValues] = useState(draft);
  const [state, action, pending] = useActionState(saveDocumentDraft.bind(null, locale, reference, type), {} as DocumentState);
  const fields = documentFields[type] ?? [];
  return <>
    <button ref={opener} type="button" className="button button-outline button-small" onClick={() => dialog.current?.showModal()}>{fr ? "Préparer ce document" : "Prepare this document"}</button>
    {Object.keys(draft).length > 0 && <p className="document-draft-note">{fr ? "Brouillon enregistré · pièce finale à joindre" : "Draft saved · final document still needed"}</p>}
    <dialog ref={dialog} className="document-modal" aria-labelledby={id} onClose={() => opener.current?.focus()} onClick={event => { if (event.target === event.currentTarget) { const rect=event.currentTarget.getBoundingClientRect(); if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) dialog.current?.close(); } }}>
      <div className="document-modal-heading"><h2 id={id}>{title}</h2><button type="button" className="text-action" onClick={() => dialog.current?.close()}>{fr ? "Fermer" : "Close"}</button></div>
      <p>{fr ? "Préparez les informations de cette pièce. Ce brouillon ne remplace pas le document officiel, sa signature, sa légalisation ou sa traduction." : "Prepare the details for this document. This draft does not replace the official document, signatures, authentication or translation."}</p>
      <form className="application-form" action={action}>
        {fields.map(([name, en, french]) => <label className="form-field" key={name}><span>{fr ? french : en}</span><textarea name={name} rows={2} maxLength={3000} value={values[name] ?? ""} onChange={event => { setValues(previous => ({ ...previous, [name]: event.target.value })); }} /></label>)}
        {state.error && <p role="alert" className="intake-feedback">{state.error}</p>}
        {state.saved && <p role="status" className="feedback-success">{fr ? "Brouillon enregistré. Joignez la pièce finale ci-dessous." : "Draft saved. Attach the final document below."}</p>}
        <button type="submit" className="button" disabled={pending}>{pending ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Enregistrer le brouillon" : "Save draft")}</button>
      </form>
      <section className="document-modal-upload"><h3>{fr ? "Joindre le document final" : "Attach the final document"}</h3>{children}</section>
    </dialog>
  </>;
}
