import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead } from "../_components/SettingsPrimitives";
import { PreferencesForm } from "./_components/PreferencesForm";

export const metadata: Metadata = { title: "Préférences" };

export default async function PreferencesSettingsPage(): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: authUser.id },
    select: { theme: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PRÉFÉRENCES" hint="apparence & langue" />
      <PreferencesForm initialTheme={prefs?.theme ?? "dark"} />
    </div>
  );
}
