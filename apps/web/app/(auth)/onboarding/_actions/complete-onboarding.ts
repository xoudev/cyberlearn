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

/**
 * Server Action: completes onboarding by setting username + displayName.
 * After this, the user is redirected to the placement test (optional) or dashboard.
 */
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

  // ── Validate input ───────────────────────────────────────────────────────
  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { username, displayName } = parsed.data;

  // ── Check username availability ──────────────────────────────────────────
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

  // ── Save username + displayName + create preferences ────────────────────
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { username, displayName },
    }),
    prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    }),
  ]);

  // ── Determine next step ──────────────────────────────────────────────────
  const skipPlacementTest = formData.get("skipPlacementTest") === "true";

  if (skipPlacementTest) {
    redirect("/dashboard");
  }

  redirect("/onboarding/placement-test");
}
