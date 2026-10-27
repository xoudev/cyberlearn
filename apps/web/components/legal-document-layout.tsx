import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/app/_components/public-navbar";
import { AppShell } from "./app-shell";
import { Footer } from "./footer";
import "./legal-document.css";

/** The list of the legal texts beside the document, and the way back. */
function LegalNavigation({ member }: { member: boolean }): React.JSX.Element {
  return (
    <nav className="legal-navigation" aria-label="Documents légaux">
      <p>Informations</p>
      <Link href="/legal">Mentions légales</Link>
      <Link href="/legal/terms">Conditions d’utilisation</Link>
      <Link href="/privacy">Confidentialité</Link>
      {member ? (
        <Link href="/dashboard">Retour au tableau de bord</Link>
      ) : (
        <Link href="/">Retour à l’accueil</Link>
      )}
    </nav>
  );
}

/**
 * The legal texts (mentions légales, CGU, confidentialité), in the site
 * around them.
 *
 * Signed in, they are pages of the app: the sidebar, the navbar and the app's
 * own footer, whose "CGU", "Confidentialité" and "Mentions légales" lead here.
 * They used to be drawn with the public navbar for everybody, so a learner
 * who followed one of those links left the app, still signed in, in front of
 * "Connexion" and "Commencer gratuitement". Signed out, they keep the public
 * navbar and the visitors' footer.
 *
 * The layouts decide which, as the catalogue's does (app/catalogue/layout.tsx),
 * and hand the account over: `readerId` is appShellReaderId's answer, null
 * for the visitors' frame. These pages are also open to a session that still
 * owes its second-factor code, which the shell must not show the account to.
 */
export function LegalDocumentLayout({
  readerId,
  children,
}: {
  readerId: string | null;
  children: React.ReactNode;
}): React.JSX.Element {
  if (readerId !== null) {
    // The shell draws <main id="contenu"> and the footer itself.
    return (
      <AppShell userId={readerId}>
        <div className="legal-page legal-page--member">
          <div className="legal-layout">
            <LegalNavigation member />
            <div className="legal-document">{children}</div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <div className="legal-page">
      <PublicNavbar />
      <main id="contenu" className="legal-layout">
        <LegalNavigation member={false} />
        <div className="legal-document">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
