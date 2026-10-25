import type { Metadata } from "next";
import { pageAddress } from "@/app/page-metadata";
import Link from "next/link";
import { PublicNavbar } from "@/app/_components/public-navbar";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Signale un bug, une erreur de contenu ou envoie une suggestion à CyberLearn.",
  ...pageAddress("/contact"),
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="contact-page">
      <PublicNavbar />
      <main id="contenu" className="contact-layout">
        <header className="contact-intro">
          <p className="contact-kicker">Contact / Une question, une demande</p>
          <h1>
            On t’écoute<span>.</span>
          </h1>
          <p>
            Un bug, une suggestion ou une question ? Décris ta demande pour que l’équipe puisse
            t’aider.
          </p>
          <Link href="/">Retour à l’accueil</Link>
        </header>
        <section className="contact-panel" aria-label="Formulaire de contact">
          {children}
        </section>
      </main>
    </div>
  );
}
