"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readQuiz, type Locale } from "../site/answers";
import { databaseConfigured } from "../server/database";
import { intakeFlags, type Intake } from "./documents";
import { currentUser } from "./supabase";
import { createCase } from "./store";
import { casePath } from "./paths";
import { registrationDetails, type ApplicationState } from "./registration";

export async function saveRegistration(locale: Locale, token: string, _state: ApplicationState, form: FormData): Promise<ApplicationState> {
  const user = await currentUser();
  if (!user) return { error: locale === "fr" ? "Reconnectez-vous avant d’enregistrer." : "Sign in again before saving." };
  const details = registrationDetails(form);
  const quiz = readQuiz({ ...Object.fromEntries(["form", "capital", "address", "statutes", "trade", "sector", "package"].map(key => {
    const value = form.get(key);
    return [key, typeof value === "string" ? value : undefined];
  })), estimate: "1" });
  if (!details || !/^[0-9a-f-]{36}$/i.test(token) || !["quoted", "review"].includes(quiz.state)) {
    return { error: locale === "fr" ? "Vérifiez les champs obligatoires et les coordonnées du mandataire." : "Check the required fields and your representative’s contact details." };
  }
  if (!databaseConfigured()) return { error: locale === "fr" ? "L’enregistrement est indisponible. Vos réponses restent affichées ; réessayez plus tard." : "Saving is currently unavailable. Your answers remain on this page; please try again later." };
  const flags = Object.fromEntries(intakeFlags.map(flag => [flag, form.get(flag) === "on"])) as Intake["flags"];
  let reference: string;
  try {
    if (quiz.state !== "quoted" && quiz.state !== "review") return { error: "Invalid application." };
    reference = await createCase(user, locale, token, details.name, details.company, quiz, flags, details);
  } catch (error) {
    // Log only the machine-readable code, never credentials or applicant details.
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      && /^[A-Z0-9_]{2,40}$/.test(error.code) ? error.code : "UNKNOWN";
    console.error("Application creation failed; check the database connection and migrations. Code:", code);
    return { error: locale === "fr" ? "Le dossier n’a pas été enregistré. Vos réponses restent affichées ; réessayez plus tard." : "Your application could not be saved. Your answers remain on this page; please try again later." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dossiers");
  revalidatePath("/en/cases");
  redirect(casePath(locale, reference));
}
