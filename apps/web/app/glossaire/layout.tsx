import React from "react";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PublicNavbar } from "@/app/_components/public-navbar";
import "./glossaire.css";

/**
 * The glossary, in the site around it.
 *
 * A lesson's "Tous les termes →" opens it in the same tab. Drawn with the
 * public navbar alone, it took the learner out of the app: no sidebar, no way
 * back to the lesson, and "Connexion" offered to somebody signed in. Signed
 * in, it is a page of the app like any other; signed out, it stays the public
 * page it is in the sitemap for.
 *
 * Not under (app), whose layout sends anybody signed out to the login. A
 * banned account reads it as a visitor does, since the app the shell leads
 * into is closed to it (the public profile's rule, app/u/[username]).
 */
export default async function GlossaryLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const viewer = await getRequestUser();
  if (viewer !== null && (await getActiveBan()) === null) {
    return <AppShell userId={viewer.id}>{children}</AppShell>;
  }

  return (
    <div className="glossary-page">
      <PublicNavbar />
      <main id="contenu">{children}</main>
    </div>
  );
}
