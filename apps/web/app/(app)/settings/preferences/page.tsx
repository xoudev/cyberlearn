import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead } from "../_components/SettingsPrimitives";
import { prisma } from "@cyberlearn/db";
import { PreferencesForm } from "./_components/PreferencesForm";
import { RevisionsForm } from "./_components/RevisionsForm";

export const metadata: Metadata = { title: "Préférences" };

export default async function PreferencesSettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
    select: { spacedRepetition: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PRÉFÉRENCES" hint="apparence, langue & révisions" />
      <PreferencesForm />
      <RevisionsForm initial={prefs?.spacedRepetition ?? true} />
    </div>
  );
}
