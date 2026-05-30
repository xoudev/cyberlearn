import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { SectionHead, SettingsCard } from "../_components/SettingsPrimitives";
import { ProfileForm } from "./_components/ProfileForm";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfileSettingsPage(): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { username: true, displayName: true, bio: true, avatarUrl: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PROFIL" hint="visible selon ta confidentialité" />
      <SettingsCard title="Ton identité">
        <ProfileForm
          username={user?.username ?? ""}
          initialDisplayName={user?.displayName ?? ""}
          initialBio={user?.bio ?? ""}
          initialAvatarUrl={user?.avatarUrl ?? ""}
        />
      </SettingsCard>
    </div>
  );
}
