import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead } from "../_components/SettingsPrimitives";
import { PrivacyForm } from "./_components/PrivacyForm";

export const metadata: Metadata = { title: "Confidentialité" };

export default async function PrivacySettingsPage(): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: authUser.id },
    select: { leaderboardVisibility: true, publicProfile: true },
  });

  // Fallback to the privacy-first defaults when no preferences row exists yet.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="CONFIDENTIALITÉ" hint="qui voit quoi" />
      <PrivacyForm
        initialVisibility={prefs?.leaderboardVisibility ?? "ANONYMOUS"}
        initialPublicProfile={prefs?.publicProfile ?? true}
      />
    </div>
  );
}
