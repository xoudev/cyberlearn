import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { loadPreferencesSection } from "../_lib/load-settings";
import { PreferencesSection } from "./_components/PreferencesSection";

export const metadata: Metadata = { title: "Préférences" };

export default async function PreferencesSettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <PreferencesSection data={await loadPreferencesSection(user.id)} />;
}
