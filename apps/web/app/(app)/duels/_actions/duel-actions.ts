"use server";

import { requireRequestUser } from "@/lib/auth";
import {
  answerDuel,
  createDuel,
  duelViewFor,
  respondToDuel,
  type DuelAnswerResult,
  type DuelCreateResult,
  type DuelResult,
  type DuelView,
} from "@/lib/social/duels";

/**
 * The site's entry points for quiz duels: the session, then the service the
 * app uses too (@/lib/social/duels), which reads its input with Zod.
 */

export async function createDuelAction(input: unknown): Promise<DuelCreateResult> {
  const user = await requireRequestUser();
  return createDuel(user.id, input);
}

export async function respondToDuelAction(duelId: unknown, accept: unknown): Promise<DuelResult> {
  const user = await requireRequestUser();
  return respondToDuel(user.id, duelId, accept);
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
