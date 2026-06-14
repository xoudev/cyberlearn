import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { SectionHead, SettingsCard } from "../_components/SettingsPrimitives";
import { ProfileForm } from "./_components/ProfileForm";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfileSettingsPage(): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { username: true, displayName: true, bio: true, avatarUrl: true },
  });

  // Resolve an uploaded avatar to a signed URL for the preview; built-ins and
  // glyphs pass through unchanged (the form handles those itself).
  const avatarUrl = user?.avatarUrl ?? "";
  const avatarPreview = avatarUrl.startsWith("__upload:")
    ? await resolveAvatarSrc(avatarUrl)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SectionHead label="PROFIL" hint="visible selon ta confidentialité" />
      <SettingsCard title="Ton identité">
        <ProfileForm
          username={user?.username ?? ""}
          initialDisplayName={user?.displayName ?? ""}
          initialBio={user?.bio ?? ""}
          initialAvatarUrl={avatarUrl}
          initialAvatarPreview={avatarPreview}
        />
      </SettingsCard>
    </div>
  );
}
