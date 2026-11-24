import type { Query } from "../../../../site/answers";
import { Application } from "../../../../intake/pages";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Query>;
}) {
  return <Application locale="fr" reference={(await params).reference} query={searchParams} />;
}
