import type { Query } from "../../../site/answers";
import { EstimatePage } from "../../../site/pages";
import { publicPageMetadata } from "../../../site/seo";

export const metadata = publicPageMetadata("fr", "quote");

export default function Quote({ searchParams }: { searchParams: Promise<Query> }) {
  return <EstimatePage locale="fr" query={searchParams} />;
}
