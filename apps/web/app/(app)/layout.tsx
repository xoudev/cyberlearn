import React from "react";
import { requireRequestUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/**
 * Every page of the signed-in site, in the shell (components/app-shell.tsx).
 * Signed out goes to the login and banned to /banned before anything is
 * drawn: requireRequestUser.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <AppShell userId={user.id}>{children}</AppShell>;
}
