"use server";

import { revalidatePath } from "next/cache";
import type { Locale } from "../site/answers";
import { transaction } from "../server/database";
import { currentUser } from "./supabase";
import { checklist, type Intake } from "./documents";
import { parseDocumentDraft } from "./document-fields";
import { casePath } from "./paths";

export type DocumentState = { error?: string; saved?: boolean };

export async function saveDocumentDraft(locale: Locale, reference: string, type: string, _state: DocumentState, form: FormData): Promise<DocumentState> {
  const user = await currentUser();
  const fields = parseDocumentDraft(type, form);
  const invalid = { error: locale === "fr" ? "Vérifiez les champs et votre connexion." : "Check the fields and your sign-in session." };
  if (!user || !fields) return invalid;
  try {
    const saved = await transaction(async client => {
      const result = await client.query<{ id: string; intake: Intake | null }>(`select c.id, c.intake from public.cases c
        join public.companies co on co.id=c.company_id join public.users u on u.id=co.owner_id
        where c.reference=$1 and u.auth_user_id=$2 and c.status='draft' for update of c`, [reference, user.id]);
      const record = result.rows[0];
      if (!record?.intake || !checklist(record.intake).some(item => item.id === type)) return false;
      await client.query(`insert into public.document_drafts(case_id,document_type,fields) values($1,$2,$3)
        on conflict(case_id,document_type) do update set fields=excluded.fields,updated_at=now()`, [record.id, type, JSON.stringify(fields)]);
      return true;
    });
    if (!saved) return invalid;
  } catch {
    return { error: locale === "fr" ? "Le brouillon n’a pas été enregistré. Réessayez." : "The draft could not be saved. Please try again." };
  }
  revalidatePath(casePath("fr", reference));
  revalidatePath(casePath("en", reference));
  return { saved: true };
}
