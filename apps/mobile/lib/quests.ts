/**
 * The week's quests in the app. What a quest is worth and whether it may be
 * claimed are the server's (apps/web/lib/quests/claim.ts); the words and the
 * week's arithmetic come from @cyberlearn/lib/gamification/weekly-quests, which
 * the site's dashboard reads too.
 */

import { QUEST_COPY } from "@cyberlearn/lib/gamification/weekly-quests";

export {
  QUEST_COPY,
  fmtWeekReset,
  questProgressPct,
  questState,
  splitWeekQuests,
  weekCompletion,
} from "@cyberlearn/lib/gamification/weekly-quests";
export { msUntilWeekReset } from "@cyberlearn/lib/gamification/week";

/** What the card says once a claim comes back: the XP gained, or why not. */
export function claimFeedback(
  reply: { ok: boolean; xpGained?: number; error?: string },
  xpReward: number,
): { tone: "success" | "error"; text: string } {
  if (reply.ok)
    return { tone: "success", text: QUEST_COPY.claimedToast(reply.xpGained ?? xpReward) };
  return { tone: "error", text: reply.error ?? "Réclamation impossible." };
}
