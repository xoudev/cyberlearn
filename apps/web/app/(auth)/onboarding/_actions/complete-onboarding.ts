"use server";

import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@cyberlearn/types";
import { redirect } from "next/navigation";

export interface OnboardingActionState {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

export async function completeOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { username, displayName, bio } = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== user.id) {
    return {
      success: false,
      errors: { username: ["Ce nom d'utilisateur est déjà pris."] },
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { username, displayName, bio: bio ?? null },
    }),
    prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    }),
  ]);

  // onboarding_complete is set only after the avatar + placement steps
  redirect("/onboarding/avatar");
}
