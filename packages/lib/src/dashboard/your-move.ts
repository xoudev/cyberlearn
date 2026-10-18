import type { TournamentPhase } from "../challenges/tournament";

/**
 * What waits on the reader and will not wait long: a duel a friend sent them,
 * a tournament under way. The site's dashboard and the app's home tab show
 * both, each from the lists it already reads; these are the rules both apply.
 */

interface InvitationLike {
  status: string;
  /** The reader sent the challenge: then it waits on the other, not on them. */
  readerIsChallenger: boolean;
  expiresAt: string;
}

interface TournamentLike {
  phase: TournamentPhase;
  endsAt: string;
}

/**
 * The invitations waiting on the reader's answer, the one lapsing first
 * first. One past its time is left out: it lapses when read, whichever list
 * reads it first.
 */
export function receivedInvitations<T extends InvitationLike>(duels: readonly T[], now: Date): T[] {
  return duels
    .filter(
      (duel) =>
        duel.status === "PENDING" &&
        !duel.readerIsChallenger &&
        Date.parse(duel.expiresAt) > now.getTime(),
    )
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/** The tournaments under way, the one closing first first. */
export function runningTournaments<T extends TournamentLike>(tournaments: readonly T[]): T[] {
  return tournaments
    .filter((tournament) => tournament.phase === "RUNNING")
    .sort((a, b) => a.endsAt.localeCompare(b.endsAt));
}
