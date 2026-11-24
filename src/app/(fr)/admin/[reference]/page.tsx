import type { Query } from "../../../../site/answers";
import { AdminCasePage } from "../../../../admin/pages";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Query>;
}) {
  return <AdminCasePage locale="fr" reference={(await params).reference} query={searchParams} />;
}
