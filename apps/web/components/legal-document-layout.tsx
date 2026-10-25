import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/app/_components/public-navbar";
import { Footer } from "./footer";
import "./legal-document.css";

export function LegalDocumentLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="legal-page">
      <PublicNavbar />
      <main id="contenu" className="legal-layout">
        <nav className="legal-navigation" aria-label="Documents légaux">
          <p>Informations</p>
          <Link href="/legal">Mentions légales</Link>
          <Link href="/legal/terms">Conditions d’utilisation</Link>
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/">Retour à l’accueil</Link>
        </nav>
        <div className="legal-document">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
