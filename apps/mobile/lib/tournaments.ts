import { colors, division } from "@cyberlearn/tokens";
import type {
  TournamentChallengeState,
  TournamentChallengeStatus,
  TournamentPhase,
  TournamentTeamScope,
} from "@cyberlearn/lib/challenges/tournament";

/**
 * CTF tournaments as /api/mobile/tournaments sends them: the site's views
 * (apps/web/lib/tournaments/tournaments.ts), mirrored here because the app
 * does not import the site. What both apps work out about a tournament, its
 * words and where the reader stands, is @cyberlearn/lib/challenges/tournament;
 * what is here is the app's own: its colours, its timings, a challenge's file
 * as a link the phone opens, and the line a flag's answer shows.
 */

export type TournamentRole = "player" | "teacher" | "admin";

export interface TournamentSummary {
  id: string;
  title: string;
  phase: TournamentPhase;
  teamScope: TournamentTeamScope;
  startsAt: string;
  endsAt: string;
  startsLabel: string;
  endsLabel: string;
  classCount: number;
  challengeCount: number;
}

export interface TournamentTeamRow {
  rank: number;
  name: string;
  detail: string;
  points: number;
  solved: number;
  isMine: boolean;
}

export interface TournamentPlayerRow {
  rank: number;
  name: string;
  team: string;
  points: number;
  solved: number;
  isMe: boolean;
}

export interface TournamentChallengeRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  type: string;
  points: number;
  solvedByMe: boolean;
  solvedByMyTeam: boolean;
  solveCount: number;
  firstTeam: string | null;
}

export interface TournamentView extends TournamentSummary {
  description: string;
  serverNow: string;
  role: TournamentRole;
  myTeam: string | null;
  canPlay: boolean;
  challenges: TournamentChallengeRow[];
  teams: TournamentTeamRow[];
  players: TournamentPlayerRow[];
  me: { points: number; solved: number; rank: number | null } | null;
}

export interface TournamentChallengeView {
  tournament: {
    id: string;
    title: string;
    phase: TournamentPhase;
    endsAt: string;
    serverNow: string;
    canPlay: boolean;
    myTeam: string | null;
  };
  challenge: {
    id: string;
    slug: string;
    title: string;
    description: string;
    instructions: string;
    category: string;
    difficulty: string;
    type: string;
    points: number;
    onMachine: boolean;
    starterCode: string | null;
    attachmentUrl: string | null;
    resourceUrl: string | null;
  };
  solved: boolean;
}

export type TournamentFlagReply =
  | { ok: true; correct: true; points: number; already: boolean }
  | { ok: true; correct: false }
  | { ok: false; error: string };

/** The colour a tournament's phase is drawn in: running in the success tone, as on the site. */
export const PHASE_COLOR: Record<TournamentPhase, string> = {
  RUNNING: colors.success,
  UPCOMING: colors.info,
  FINISHED: colors.textMuted,
};

/** The tournaments' own accent, the challenges' red: a tournament is a CTF. */
export const TOURNAMENT_ACCENT = colors.danger;

/** How often the tournament screen reads the scoreboard again while it runs, as the site does. */
export const TOURNAMENT_REFRESH_MS = 5000;

/** From five minutes before the end, the countdown takes the warning tone, as on the site. */
export const COUNTDOWN_LOW_MS = 5 * 60_000;

/**
 * The colour of a place: the first three in the medal colours once they have
 * scored, a podium of teams still at zero saying nothing; null otherwise.
 */
export function medalColor(rank: number, scored: boolean): string | null {
  if (!scored) return null;
  if (rank === 1) return division.OR;
  if (rank === 2) return division.ARGENT;
  if (rank === 3) return division.BRONZE;
  return null;
}

/**
 * The colour of a challenge's state on the board: found by the reader, by
 * their team, by others; one nobody found is a call to play while it runs,
 * and no longer once it is over.
 */
export function challengeStateColor(state: TournamentChallengeState, over: boolean): string {
  if (state === "mine") return colors.success;
  if (state === "team") return colors.info;
  if (state === "found" || over) return colors.textMuted;
  return TOURNAMENT_ACCENT;
}

/** The colour of the reader's status on a challenge's page. */
export const CHALLENGE_STATUS_COLOR: Record<TournamentChallengeStatus, string> = {
  solved: colors.success,
  open: TOURNAMENT_ACCENT,
  closed: colors.textSecondary,
  watch: colors.textSecondary,
};

/**
 * A challenge's file as a link the phone can open: an address of its own, or
 * a path on the site. Anything else is not opened.
 */
export function siteLink(url: string, siteUrl: string): string | null {
  if (/^https?:\/\//iu.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return `${siteUrl.replace(/\/+$/u, "")}${url}`;
  return null;
}

/** What a flag's answer says to the player. */
export function flagReplyLine(reply: TournamentFlagReply): { ok: boolean; text: string } {
  if (!reply.ok) return { ok: false, text: reply.error };
  if (!reply.correct) return { ok: false, text: "Ce n'est pas le flag. Essaie encore." };
  if (reply.already) return { ok: true, text: "Tu avais déjà trouvé ce flag." };
  return {
    ok: true,
    text: `Flag accepté : +${String(reply.points)} points pour toi et ton équipe.`,
  };
}
