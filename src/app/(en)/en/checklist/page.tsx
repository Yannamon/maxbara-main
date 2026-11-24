import { RegistrationChecklist } from "../../../../site/checklist";
import { SiteFrame } from "../../../../site/frame";
import { publicPageMetadata } from "../../../../site/seo";

export const metadata = publicPageMetadata("en", "checklist");

export default function ChecklistPage() {
  return <SiteFrame locale="en" alternateHref="/checklist"><RegistrationChecklist locale="en" /></SiteFrame>;
}
