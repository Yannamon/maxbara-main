import { Landing } from "../../../site/pages";
import { publicPageMetadata } from "../../../site/seo";

export const metadata = publicPageMetadata("en", "home");

export default function Home() {
  return <Landing locale="en" />;
}
