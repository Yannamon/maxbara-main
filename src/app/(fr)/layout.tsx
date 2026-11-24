import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageEntrance, SiteMotion } from "../../site/motion";
import "../globals.css";
import "../landing.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Max Bara | Création d’entreprise en Côte d’Ivoire",
  description: "Estimez les frais de création et de domiciliation de votre société en Côte d’Ivoire.",
};

export default function FrenchLayout({ children }: { children: ReactNode }) {
  return <html lang="fr"><body><SiteMotion><PageEntrance>{children}</PageEntrance></SiteMotion></body></html>;
}
