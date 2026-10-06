"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import { completeFor, revealHintFor, submitFlagFor } from "@/lib/challenges/play";

/**
 * The site's doors to a challenge: who is asking, then lib/challenges/play.ts,
 * which the app's routes call too, then the pages to refresh.
 */

function refresh(): void {
  revalidatePath("/challenges");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function submitFlagAction(
  challengeId: string,
  submittedFlag: string,
): Promise<{ correct: boolean; error?: string; xpEarned?: number }> {
  const user = await requireRequestUser();
  const result = await submitFlagFor(user.id, challengeId, submittedFlag);
  refresh();
  return result;
}

export async function completeChallengeAction(
  challengeId: string,
): Promise<{ error?: string; xpEarned?: number }> {
  const user = await requireRequestUser();
  const result = await completeFor(user.id, challengeId);
  refresh();
  return result;
}

export async function revealHintAction(
  hintId: string,
): Promise<{ content?: string; error?: string }> {
  const user = await requireRequestUser();
  const result = await revealHintFor(user.id, hintId);
  refresh();
  return result;
}
