"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cyberlearn/db";
import { updatePrivacySchema } from "@cyberlearn/types";
import { requireRequestUser } from "@/lib/auth";

export interface UpdatePrivacyState {
  success?: boolean;
  error?: string;
}

/** Strict "true"/"false" → boolean. Anything else is undefined → Zod rejects it. */
function readBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Updates the signed-in user's leaderboard visibility and public-profile flag.
 *
 * Auth-first (security rule #8), then Zod safeParse — never trust the form.
 * leaderboardVisibility drives server-side anonymization in leaderboardRepository,
 * so an invalid value must never reach the database.
 */
export async function updatePrivacyAction(
  _prev: UpdatePrivacyState,
  formData: FormData,
): Promise<UpdatePrivacyState> {
  const authUser = await requireRequestUser();

  const parsed = updatePrivacySchema.safeParse({
    leaderboardVisibility: formData.get("leaderboardVisibility"),
    publicProfile: readBoolean(formData.get("publicProfile")),
  });
  if (!parsed.success) {
    return { error: "Paramètres de confidentialité invalides." };
  }

  const { leaderboardVisibility, publicProfile } = parsed.data;

  // Upsert: a user who reached settings has completed onboarding (so the row
  // exists), but upsert stays correct even if the preferences row is missing.
  await prisma.userPreferences.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, leaderboardVisibility, publicProfile },
    update: { leaderboardVisibility, publicProfile },
  });

  // A visibility change must be reflected on the leaderboard right away.
  revalidatePath("/settings/privacy");
  revalidatePath("/classement");
  revalidatePath("/leaderboard");

  return { success: true };
}
