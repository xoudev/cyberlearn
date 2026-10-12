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
 * Updates the signed-in user's leaderboard visibility, public-profile flag and
 * friends-board opt-in.
 *
 * Auth-first (security rule #8), then Zod safeParse - never trust the form.
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
    friendsLeaderboard: readBoolean(formData.get("friendsLeaderboard")),
  });
  if (!parsed.success) {
    return { error: "Paramètres de confidentialité invalides." };
  }

  const { leaderboardVisibility, publicProfile, friendsLeaderboard } = parsed.data;

  // Upsert: a user who reached settings has completed onboarding (so the row
  // exists), but upsert stays correct even if the preferences row is missing.
  await prisma.userPreferences.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, leaderboardVisibility, publicProfile, friendsLeaderboard },
    update: { leaderboardVisibility, publicProfile, friendsLeaderboard },
  });

  // A visibility change must be reflected on the leaderboard right away.
  revalidatePath("/leaderboard");

  return { success: true };
}

/** The friends-board switch alone: the same field, read the same way. */
const friendsBoardSchema = updatePrivacySchema.pick({ friendsLeaderboard: true });

/**
 * The same setting as the privacy form's "Visible par mes amis", from the
 * friends tab of the leaderboard, where an empty board is the moment the
 * question makes sense.
 *
 * It writes that one column and nothing else. The form sends its whole state
 * because it shows all of it; the leaderboard shows one switch, and sending
 * the visibility it read when the page loaded would put back whatever the
 * reader changed since in another tab - a board they hid from, re-entered.
 */
export async function setFriendsLeaderboardAction(
  _prev: UpdatePrivacyState,
  formData: FormData,
): Promise<UpdatePrivacyState> {
  const authUser = await requireRequestUser();

  const parsed = friendsBoardSchema.safeParse({
    friendsLeaderboard: readBoolean(formData.get("friendsLeaderboard")),
  });
  if (!parsed.success) {
    return { error: "Paramètres de confidentialité invalides." };
  }

  const { friendsLeaderboard } = parsed.data;
  await prisma.userPreferences.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, friendsLeaderboard },
    update: { friendsLeaderboard },
  });

  revalidatePath("/leaderboard");

  return { success: true };
}
