import React from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { avatarToKeep } from "@cyberlearn/lib/onboarding/avatars";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { AvatarForm } from "./_components/avatar-form";
import { OnboardingShell } from "../_components/onboarding-shell";

export default async function OnboardingAvatarPage(): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, displayName: true, avatarUrl: true },
  });

  if (!dbUser?.username) redirect("/onboarding");

  // The avatar to keep, drawable: a photo uploaded at this step is stored as
  // a marker, which only the server can sign. Unsigned, the tile shows the
  // initials and the step still works.
  const keep = avatarToKeep(dbUser.avatarUrl);
  const keepSrc = keep === null ? null : await resolveAvatarSrc(keep).catch(() => null);

  return (
    <OnboardingShell step={2} stepName="Avatar" panelTitle="Choisir ton avatar" panelTag="02/03">
      <AvatarForm
        currentAvatarUrl={dbUser.avatarUrl}
        currentAvatarSrc={keepSrc}
        displayName={dbUser.displayName}
      />
    </OnboardingShell>
  );
}
