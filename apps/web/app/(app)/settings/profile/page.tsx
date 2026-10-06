import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { loadProfileSection } from "../_lib/load-settings";
import { ProfileSection } from "./_components/ProfileSection";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfileSettingsPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  return <ProfileSection data={await loadProfileSection(user.id)} />;
}
