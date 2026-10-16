import React from "react";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PublicNavbar } from "@/app/_components/public-navbar";
import "./catalogue.css";

/**
 * The catalogue, in the site around it.
 *
 * Signed in, it is a page of the app: the sidebar, the navbar, and cards that
 * open the path (the page decides those). It used to be the visitors'
 * showcase for everybody, the public navbar offering "Connexion" to somebody
 * signed in, and every card leading to the sign-up form, which sent them on
 * to the dashboard. Signed out, it stays that showcase.
 *
 * Decided here rather than in the page so the skeleton (loading.tsx) is drawn
 * in the frame the page will be drawn in. Not under (app), whose layout sends
 * anybody signed out to the login. A banned account reads it as a visitor
 * does (the public profile's rule, app/u/[username]).
 */
export default async function CatalogueLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const viewer = await getRequestUser();
  if (viewer !== null && (await getActiveBan()) === null) {
    return <AppShell userId={viewer.id}>{children}</AppShell>;
  }

  return (
    <div className="public-catalogue">
      <PublicNavbar />
      <main id="contenu">{children}</main>
    </div>
  );
}
