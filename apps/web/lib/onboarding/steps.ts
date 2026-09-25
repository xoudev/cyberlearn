import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { ONBOARDING_AVATARS } from "@cyberlearn/lib/onboarding/avatars";
import { onboardingSchema } from "@cyberlearn/types";
import { parseLearningAnswers, saveLearningAnswers } from "@/lib/paths/suggestions";
import { markOnboardingComplete } from "./finalize";

/**
 * The three steps of signing up, after the account exists: who you are, what
 * you look like, what you came for. Shared by the site's onboarding pages and
 * the app's (/api/mobile/onboarding/*), so both write the same rows with the
 * same rules.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (the session on the site, userFromBearer in the app). Lives outside
 * any "use server" module so it cannot be invoked with an arbitrary userId.
 */

export type OnboardingField = "username" | "displayName" | "bio";

export type OnboardingProfileResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<OnboardingField, string>> };

/**
 * What each field says when it is refused. The schema's own messages are in
 * English, for developers; these are the ones a person reads.
 */
export const ONBOARDING_FIELD_ERROR: Record<OnboardingField, string> = {
  username:
    "3 à 32 caractères : lettres minuscules, chiffres et tirets, sans tiret au début ni à la fin.",
  displayName: "Indique un nom affiché, 64 caractères au plus.",
  bio: "La bio compte 280 caractères au plus.",
};

export const USERNAME_TAKEN = "Ce nom d'utilisateur est déjà pris.";

function isFieldKey(key: unknown): key is OnboardingField {
  return key === "username" || key === "displayName" || key === "bio";
}

/** A unique-constraint violation: somebody took the name between the check and the write. */
function isDuplicate(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

/** Step 1: the handle, the name shown, and an optional bio. */
export async function saveOnboardingProfile(
  userId: string,
  input: unknown,
): Promise<OnboardingProfileResult> {
  const raw = typeof input === "object" && input !== null ? input : {};
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Partial<Record<OnboardingField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (isFieldKey(key)) errors[key] = ONBOARDING_FIELD_ERROR[key];
    }
    return { ok: false, errors };
  }

  const { username, displayName, bio } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing && existing.id !== userId) {
    return { ok: false, errors: { username: USERNAME_TAKEN } };
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        // An empty bio is no bio.
        data: { username, displayName, bio: bio && bio !== "" ? bio : null },
      }),
      prisma.userPreferences.upsert({
        where: { userId },
        create: { userId },
        update: {},
      }),
    ]);
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, errors: { username: USERNAME_TAKEN } };
    throw error;
  }
  return { ok: true };
}

const avatarSchema = z.enum(ONBOARDING_AVATARS);

/** Step 2: one of the built-in avatars. */
export async function saveOnboardingAvatar(
  userId: string,
  avatarUrl: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = avatarSchema.safeParse(avatarUrl);
  if (!parsed.success) return { ok: false, error: "Avatar invalide." };

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: parsed.data },
  });
  return { ok: true };
}

/**
 * Step 3's answers, kept when both questions were answered. On their own for
 * somebody going on to the placement test: the test is still part of signing
 * up, and ends it when it is submitted, as "Faire le test de positionnement"
 * does on the site.
 */
export async function saveOnboardingGoalsFor(
  userId: string,
  input: unknown,
): Promise<{ ok: true }> {
  const raw = typeof input === "object" && input !== null ? input : {};
  const answers = parseLearningAnswers({
    goals: "goals" in raw ? raw.goals : undefined,
    level: "level" in raw ? raw.level : undefined,
  });
  if (answers !== null) await saveLearningAnswers(userId, answers);
  return { ok: true };
}

/**
 * Step 3, the app's end of it: keeps the questionnaire's answers when both
 * questions were answered, then marks the sign-up complete. Skipping sends no
 * answers and still completes it, as "Passer, j'explore seul" does on the site.
 *
 * The flag lives in the account's app_metadata, which the site's middleware
 * reads from the token: the app refreshes its session afterwards, so the next
 * visit to the site does not send the account back into onboarding.
 */
export async function finishOnboardingFor(userId: string, input: unknown): Promise<{ ok: true }> {
  await saveOnboardingGoalsFor(userId, input);
  await markOnboardingComplete(userId);
  return { ok: true };
}
