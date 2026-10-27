import { tournamentRepository } from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { evaluateAndAwardBadges } from "@/lib/badges/award";

/**
 * The badges of a place on a tournament's board (TOURNAMENT_RANK). Nothing
 * happens when a tournament reaches its end, so they are given at three
 * moments, whichever comes first: the nightly job
 * (app/api/cron/tournament-badges), the board of a finished tournament opened
 * by one of its players (tournamentViewFor), and the sweep of the badge
 * collection, which gives them silently. A badge held is never given twice.
 */

/** How far back the nightly job looks: a night or two missed is made up. */
export const TOURNAMENT_BADGE_LOOKBACK_MS = 7 * 86_400_000;

export interface TournamentBadgeRun {
  /** Players of the tournaments that ended in the window. */
  players: number;
  /** Badges given to them. */
  awarded: number;
  /** Players whose badges could not be given; the others still were. */
  failed: number;
}

/** Gives the players of the tournaments ended lately the badges their team's place earned. */
export async function awardTournamentPlaces(now: Date = new Date()): Promise<TournamentBadgeRun> {
  const from = new Date(now.getTime() - TOURNAMENT_BADGE_LOOKBACK_MS);
  const players = await tournamentRepository.playersOfEndedBetween(from, now);
  let awarded = 0;
  let failed = 0;
  for (const userId of players) {
    try {
      const result = await evaluateAndAwardBadges(userId, ["TOURNAMENT_RANK"], {
        source: "tournament",
      });
      awarded += result.awarded.length;
    } catch (err) {
      failed += 1;
      logger.error({ scope: "badges", err: errorMessage(err) }, "tournament place badges failed");
    }
  }
  return { players: players.length, awarded, failed };
}
