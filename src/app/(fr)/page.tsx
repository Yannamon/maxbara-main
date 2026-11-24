import { Landing } from "../../site/pages";
import { publicPageMetadata } from "../../site/seo";

export const metadata = publicPageMetadata("fr", "home");

export default function Home() {
  return <Landing locale="fr" />;
}
