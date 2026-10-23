import React from "react";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/**
 * The download page, in the site around it.
 *
 * Signed in, it is a page of the app: the footer's "Application mobile" leads
 * here, and it used to drop the reader out of the app onto a page offering to
 * sign in or create an account. Signed out, it stays the visitors' page, with
 * its own navbar (drawn by the page, inside its frame). A banned account reads
 * it as a visitor does, since the app the shell leads into is closed to it:
 * the catalogue and the public profile follow the same rule.
 */
export default async function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const viewer = await getRequestUser();
  if (viewer !== null && (await getActiveBan()) === null) {
    return <AppShell userId={viewer.id}>{children}</AppShell>;
  }
  return <>{children}</>;
}
