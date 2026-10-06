import { colors } from "@cyberlearn/tokens";
import {
  placeLabel,
  type TournamentPhase,
  type TournamentTeamScope,
} from "@cyberlearn/lib/challenges/tournament";

/**
 * CTF tournaments as /api/mobile/tournaments sends them: the site's views
 * (apps/web/lib/tournaments/tournaments.ts), mirrored here because the app
 * does not import the site.
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

/** The colour a tournament's phase is drawn in. */
export const PHASE_COLOR: Record<TournamentPhase, string> = {
  RUNNING: colors.accent,
  UPCOMING: colors.info,
  FINISHED: colors.textMuted,
};

/** How often the tournament screen reads the scoreboard again while it runs, as the site does. */
export const TOURNAMENT_REFRESH_MS = 5000;

/** Where a challenge stands for the reader, in a word or two. */
export function challengeStateLine(challenge: TournamentChallengeRow): string {
  if (challenge.solvedByMe) return "trouvé par toi";
  if (challenge.solvedByMyTeam) return "trouvé par ton équipe";
  if (challenge.solveCount === 0) return "pas encore trouvé";
  const plural = challenge.solveCount > 1 ? "s" : "";
  return `${String(challenge.solveCount)} flag${plural} trouvé${plural}`;
}

/** The reader's own score: "300 pts · 2 flags · 3e". */
export function myStandingLine(me: NonNullable<TournamentView["me"]>): string {
  const flags = `${String(me.solved)} flag${me.solved > 1 ? "s" : ""}`;
  const place = me.rank === null ? "" : ` · ${placeLabel(me.rank)}`;
  return `${String(me.points)} pts · ${flags}${place}`;
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
