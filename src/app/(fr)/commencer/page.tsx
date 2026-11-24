import type { Query } from "../../../site/answers";
import { IntakeStart } from "../../../intake/pages";

export const dynamic = "force-dynamic";

export default function Start({ searchParams }: { searchParams: Promise<Query> }) {
  return <IntakeStart locale="fr" query={searchParams} />;
}
