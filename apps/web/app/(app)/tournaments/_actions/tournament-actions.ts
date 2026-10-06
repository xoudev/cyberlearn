"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import {
  submitTournamentFlag,
  tournamentViewFor,
  type TournamentFlagResult,
  type TournamentView,
} from "@/lib/tournaments/tournaments";

/**
 * The site's side of the tournaments: the scoreboard read again while the
 * tournament runs, and a flag given. The service checks the inputs and who may
 * do what (lib/tournaments/tournaments.ts); the app reaches it through
 * /api/mobile/tournaments.
 */

export async function tournamentViewAction(tournamentId: unknown): Promise<TournamentView | null> {
  const user = await requireRequestUser();
  return tournamentViewFor(user.id, tournamentId);
}

export async function submitTournamentFlagAction(input: unknown): Promise<TournamentFlagResult> {
  const user = await requireRequestUser();
  const result = await submitTournamentFlag(user.id, input);
  if (result.ok && result.correct && !result.already) revalidatePath("/tournaments", "layout");
  return result;
}
