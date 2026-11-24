import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageEntrance, SiteMotion } from "../../site/motion";
import "../globals.css";
import "../landing.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Max Bara | Company formation in Côte d’Ivoire",
  description: "Estimate your company formation and registered address costs in Côte d’Ivoire.",
};

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><SiteMotion><PageEntrance>{children}</PageEntrance></SiteMotion></body></html>;
}
