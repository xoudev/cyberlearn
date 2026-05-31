import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead } from "../_components/SettingsPrimitives";
import { PreferencesForm } from "./_components/PreferencesForm";

export const metadata: Metadata = { title: "Préférences" };

export default async function PreferencesSettingsPage(): Promise<React.JSX.Element> {
  await requireRequestUser();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PRÉFÉRENCES" hint="apparence & langue" />
      <PreferencesForm />
    </div>
  );
}
