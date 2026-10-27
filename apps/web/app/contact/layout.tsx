import type { Metadata } from "next";
import { pageAddress } from "@/app/page-metadata";
import Link from "next/link";
import { PublicNavbar } from "@/app/_components/public-navbar";
import { AppShell } from "@/components/app-shell";
import { appShellReaderId } from "@/lib/auth/app-shell-reader";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Signale un bug, une erreur de contenu ou envoie une suggestion à CyberLearn.",
  ...pageAddress("/contact"),
};

/** The page's heading and its form, the same in either frame. */
function ContactBody({
  member,
  children,
}: {
  member: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <>
      <header className="contact-intro">
        <p className="contact-kicker">Contact / Une question, une demande</p>
        <h1>
          On t’écoute<span>.</span>
        </h1>
        <p>
          Un bug, une suggestion ou une question ? Décris ta demande pour que l’équipe puisse
          t’aider.
        </p>
        {member ? (
          <Link href="/dashboard">Retour au tableau de bord</Link>
        ) : (
          <Link href="/">Retour à l’accueil</Link>
        )}
      </header>
      <section className="contact-panel" aria-label="Formulaire de contact">
        {children}
      </section>
    </>
  );
}

/**
 * The contact form, in the site around it.
 *
 * Signed in, it is a page of the app: the sidebar and the navbar, as on the
 * catalogue and the glossary. It used to be drawn with the public navbar for
 * everybody, offering "Connexion" to somebody signed in. Signed out, it stays
 * the visitors' page. A session that still owes its second-factor code reads
 * it as a visitor does (appShellReaderId): the form is its way to the team
 * when the phone is lost, and the shell would show it the account.
 */
export default async function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const readerId = await appShellReaderId();
  if (readerId !== null) {
    // The shell draws <main id="contenu"> itself.
    return (
      <AppShell userId={readerId}>
        <div className="contact-page contact-page--member">
          <div className="contact-layout">
            <ContactBody member>{children}</ContactBody>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <div className="contact-page">
      <PublicNavbar />
      <main id="contenu" className="contact-layout">
        <ContactBody member={false}>{children}</ContactBody>
      </main>
    </div>
  );
}
