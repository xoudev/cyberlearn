"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import {
  answerDuel,
  createDuel,
  duelSetupFor,
  duelViewFor,
  respondToDuel,
  type DuelAnswerResult,
  type DuelCreateResult,
  type DuelResult,
  type DuelSetup,
  type DuelView,
} from "@/lib/social/duels";

/**
 * The site's entry points for quiz duels: the session, then the service the
 * app uses too (@/lib/social/duels), which reads its input with Zod.
 */

/**
 * Whom the reader may challenge and on which paths: what the "Défier" window
 * reads when it opens, over whichever page it was opened on.
 */
export async function duelSetupAction(): Promise<DuelSetup> {
  const user = await requireRequestUser();
  return duelSetupFor(user.id);
}

export async function createDuelAction(input: unknown): Promise<DuelCreateResult> {
  const user = await requireRequestUser();
  return createDuel(user.id, input);
}

/**
 * Accepting or declining takes an invitation off the count next to « Duels » in
 * the sidebar, which the shared layout renders: a soft navigation to the duel
 * does not render that layout again, so it is refreshed here.
 */
export async function respondToDuelAction(duelId: unknown, accept: unknown): Promise<DuelResult> {
  const user = await requireRequestUser();
  const result = await respondToDuel(user.id, duelId, accept);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function answerDuelAction(input: unknown): Promise<DuelAnswerResult> {
  const user = await requireRequestUser();
  return answerDuel(user.id, input);
}

/** The duel as it stands now: what the duel page reads every few seconds. */
export async function duelViewAction(duelId: unknown): Promise<DuelView | null> {
  const user = await requireRequestUser();
  return duelViewFor(user.id, duelId);
}
