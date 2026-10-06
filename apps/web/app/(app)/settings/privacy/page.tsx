import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { loadPrivacySection } from "../_lib/load-settings";
import { PrivacySection } from "./_components/PrivacySection";

export const metadata: Metadata = { title: "Confidentialité" };

export default async function PrivacySettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <PrivacySection data={await loadPrivacySection(user.id)} />;
}
