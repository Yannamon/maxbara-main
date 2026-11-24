import type { Query } from "../../../../site/answers";
import { AdminDashboard } from "../../../../admin/pages";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <AdminDashboard locale="en" query={searchParams} />;
}
