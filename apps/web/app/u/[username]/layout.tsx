import React from "react";
import Link from "next/link";
import { getActiveBan, getRequestUser } from "@/lib/auth";
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
 * leads into is closed to it.
 */
export default async function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const viewer = await getRequestUser();
  if (viewer !== null && (await getActiveBan()) === null) {
    return <AppShell userId={viewer.id}>{children}</AppShell>;
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
