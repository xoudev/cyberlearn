import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findProfileFor, profileReaderId } from "@/lib/profile/public-profile-read";
import { AppShell } from "@/components/app-shell";
import "./public-profile.css";

/**
 * A profile, in the site around it.
 *
 * Signed in, it is a page of the app like any other: the sidebar, the navbar,
 * the reader's own cosmetics on them. Opening a friend from the navbar's
 * panel used to drop the reader out of the app, onto a bare page whose only
 * way back was a link to the home page. Signed out, it stays what a shared
 * link opens: the page alone, with the way to the site.
 *
 * Decided here rather than in the page so the skeleton (loading.tsx) is drawn
 * in the frame the page will be drawn in. Not under (app): that layout sends
 * anybody signed out to the login, and a profile is a page a stranger can
 * open. A banned account reads it as a stranger does, since the app the shell
 * leads into is closed to it (profileReaderId).
 *
 * Whether there is a profile to show is also asked here, before anything is
 * streamed. The skeleton opens a Suspense boundary, so a notFound() from the
 * page behind it came after the response had started as a 200: an unknown or
 * closed profile answered "200, page introuvable", which crawlers index and
 * link checkers take for a live address. The page reads the same cached
 * lookup, so it costs no second query.
 */
export default async function PublicProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}): Promise<React.JSX.Element> {
  const { username } = await params;
  if ((await findProfileFor(username)) === null) notFound();

  const readerId = await profileReaderId();
  if (readerId !== null) {
    return <AppShell userId={readerId}>{children}</AppShell>;
  }

  return (
    <div className="pp-standalone">
      <div className="pp-standalone__bar">
        <Link href="/" className="pp-standalone__home">
          ← cyberlearn
        </Link>
      </div>
      <main id="contenu">{children}</main>
    </div>
  );
}
