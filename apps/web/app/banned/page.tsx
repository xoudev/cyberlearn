import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { banTimeLeft } from "@cyberlearn/lib";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { BannedContent } from "./_components/banned-content";

export const metadata: Metadata = { title: "Compte suspendu" };

export default async function BannedPage(): Promise<React.JSX.Element> {
  // This page reads the ban directly: requireRequestUser would redirect back here.
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const ban = await getActiveBan();
  if (!ban) redirect("/dashboard");
  const endsLabel = banTimeLeft(ban.expiresAt);
  const issuedOn = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(ban.createdAt);
  return (
    <BannedContent
      reason={ban.reason}
      endsLabel={endsLabel}
      issuedOn={issuedOn}
      alreadyAcknowledged={ban.acknowledgedAt !== null}
      alreadyAppealed={ban.appealTicketId !== null}
    />
  );
}
