import type { QuizAnswers } from "../site/answers";
import type { RegistrationDetails } from "./registration";

export const checklistSource =
  "https://www.cepici.gouv.ci/public/frontend/assets/document/doc3/liste-des-pieces-a-fournir-sarl-capital-inf-a-10-000-000-f-cfa.pdf";

export const intakeFlags = [
  "companyPartner", "missingParentage", "abidjanRecord", "inKind", "representative", "cnpsWorker",
] as const;
export type IntakeFlag = (typeof intakeFlags)[number];
export type Intake = { answers: QuizAnswers; flags: Record<IntakeFlag, boolean>; details?: RegistrationDetails };

export const documentLimit = 3 * 1024 * 1024;

export function checklist({ answers, flags }: Intake) {
  const items = [
    { id: "identity", required: true },
    { id: "statutes", required: true },
    { id: "subscription", required: true },
    { id: "decisions", required: true },
    { id: "address", required: answers.address === "yes" },
    { id: "declaration", required: true },
    { id: "managers", required: true },
    { id: "map", required: true },
    { id: "gufe", required: true },
  ];
  if (answers.statutes === "notarized") items.push({ id: "notarySlip", required: true });
  if (flags.companyPartner) {
    items.push({ id: "parentStatutes", required: true }, { id: "parentRegistration", required: true });
  }
  if (flags.missingParentage) items.push({ id: "parentage", required: true });
  if (flags.abidjanRecord) items.push({ id: "criminalRecord", required: true });
  if (flags.inKind) items.push({ id: "compliance", required: true });
  if (flags.representative) items.push({ id: "mandate", required: true });
  if (flags.cnpsWorker) items.push({ id: "workerIdentity", required: true });
  return items;
}

export function documentMime(bytes: Buffer): string | null {
  if (bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (bytes.subarray(4, 8).toString() === "ftyp") {
    const brand = bytes.subarray(8, 12).toString();
    if (["heic", "heix"].includes(brand)) return "image/heic";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
  }
  return null;
}
