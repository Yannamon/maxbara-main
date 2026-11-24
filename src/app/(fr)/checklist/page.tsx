import { RegistrationChecklist } from "../../../site/checklist";
import { SiteFrame } from "../../../site/frame";
import { publicPageMetadata } from "../../../site/seo";

export const metadata = publicPageMetadata("fr", "checklist");

export default function ChecklistPage() {
  return <SiteFrame locale="fr" alternateHref="/en/checklist"><RegistrationChecklist locale="fr" /></SiteFrame>;
}
