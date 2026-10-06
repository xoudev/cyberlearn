import { prisma, tournamentRepository } from "@cyberlearn/db";
import {
  tournamentDateLabel,
  type TournamentTeamScope,
} from "@cyberlearn/lib/challenges/tournament";
import { errorMessage, logger } from "@cyberlearn/lib/logger";

/**
 * Tells the members of the classes taking part that a tournament is coming:
 * when it opens, when it closes, who plays against whom. Sent when the
 * tournament is composed, and to a class added to it later.
 *
 * In the app's notifications only, the bell on the site and in the app: a
 * tournament is announced ahead of time, and the page says the rest.
 *
 * Nothing here may undo the tournament, which is saved when this runs: a
 * failure is logged and swallowed.
 */
export async function announceTournament(
  tournament: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    teamScope: TournamentTeamScope;
  },
  classIds: string[],
): Promise<void> {
  try {
    const userIds = await tournamentRepository.membersOf(classIds);
    if (userIds.length === 0) return;
    const versus = tournament.teamScope === "CLASS" ? "classe contre classe" : "école contre école";
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: "TOURNAMENT_ANNOUNCED" as const,
        title: `Tournoi CTF : ${tournament.title}`.slice(0, 200),
        body: `Du ${tournamentDateLabel(tournament.startsAt)} au ${tournamentDateLabel(tournament.endsAt)}, ${versus}. Les défis s'ouvrent au début.`,
        actionUrl: `/tournaments/${tournament.id}`,
        metadata: { tournamentId: tournament.id },
      })),
    });
  } catch (error) {
    logger.error(
      { scope: "tournament", err: errorMessage(error), tournamentId: tournament.id },
      "announcement failed",
    );
  }
}
