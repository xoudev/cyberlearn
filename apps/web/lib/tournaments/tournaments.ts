import { z } from "zod";
import { LeaderboardVisibility, tournamentRepository, userRepository } from "@cyberlearn/db";
import {
  firstSolves,
  playerStandings,
  teamClassOf,
  teamStandings,
  tournamentDateLabel,
  tournamentPhase,
  tournamentTeams,
  type TournamentPhase,
  type TournamentSolveRow,
  type TournamentTeamScope,
} from "@cyberlearn/lib/challenges/tournament";
import { expectedFlag } from "@/lib/challenges/play";
import { flagsMatch } from "@/lib/challenges/flag";
import { checkFlagSubmission } from "@/lib/rate-limit";

/**
 * CTF tournaments between classes, or between schools, as a learner meets
 * them: the list of theirs, a tournament's challenges and scoreboard, one of
 * its challenges to play, a flag checked and counted. Composing one is the
 * console's (apps/admin/app/(admin)/tournaments).
 *
 * Shared by the site (/tournaments and its actions) and the app
 * (/api/mobile/tournaments/*). Callers are responsible for AUTHENTICATION:
 * `userId` must be a verified identity. Whether that identity may see or play
 * a tournament is decided here, from their classes.
 *
 * The scoreboard names a player the way the leaderboard does
 * (leaderboard.visibility.ts): by name if they chose to be public, as
 * "Anonyme" otherwise, not at all if they hid themselves. Their flags count
 * for their team either way. The reader always sees their own name.
 */

/** How the reader takes part: playing for a class, following one, or overseeing all. */
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
  /** The school of a class, or the classes of a school. */
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
  /** Players who found it. */
  solveCount: number;
  /** The team that found it first. */
  firstTeam: string | null;
}

export interface TournamentMe {
  points: number;
  solved: number;
  /** Null when the reader hid themselves from leaderboards, or has no flag yet. */
  rank: number | null;
}

export interface TournamentView extends TournamentSummary {
  description: string;
  /** The server's clock, which the countdowns start from. */
  serverNow: string;
  role: TournamentRole;
  /** The reader's team, when they play. */
  myTeam: string | null;
  /** Playing for a team, while it runs. */
  canPlay: boolean;
  /** Hidden until the start, like a CTF's. */
  challenges: TournamentChallengeRow[];
  teams: TournamentTeamRow[];
  /** The first players, by their own points. */
  players: TournamentPlayerRow[];
  me: TournamentMe | null;
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

/** The page's view, plus the machine the site runs; the app is handed the view alone. */
export interface TournamentChallengePage extends TournamentChallengeView {
  machine: unknown;
}

export type TournamentFlagResult =
  | { ok: true; correct: true; points: number; already: boolean }
  | { ok: true; correct: false }
  | { ok: false; error: string };

/** How many players the scoreboard lists. */
export const PLAYER_ROWS = 50;

const uuid = z.guid();
const slugSchema = z.string().trim().min(1).max(200);
const flagSchema = z.object({
  tournamentId: uuid,
  challengeId: uuid,
  flag: z.string().trim().min(1).max(500),
});

type TournamentRow = NonNullable<Awaited<ReturnType<typeof tournamentRepository.findById>>>;
type SolveRow = Awaited<ReturnType<typeof tournamentRepository.listSolves>>[number];

interface Access {
  role: TournamentRole;
  /** The class the reader plays for, when they play. */
  teamClassId: string | null;
}

function summaryOf(
  row: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    teamScope: TournamentTeamScope;
  },
  counts: { classes: number; challenges: number },
  now: Date,
): TournamentSummary {
  return {
    id: row.id,
    title: row.title,
    phase: tournamentPhase(row, now),
    teamScope: row.teamScope,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    startsLabel: tournamentDateLabel(row.startsAt),
    endsLabel: tournamentDateLabel(row.endsAt),
    classCount: counts.classes,
    challengeCount: counts.challenges,
  };
}

/** The teams of a tournament: its classes, or the schools they belong to. */
function teamsOf(tournament: TournamentRow): ReturnType<typeof tournamentTeams> {
  return tournamentTeams(
    tournament.teamScope,
    tournament.classes.map(({ class: c }) => ({
      id: c.id,
      name: c.name,
      schoolId: c.promotion.establishment.id,
      schoolName: c.promotion.establishment.name,
    })),
  );
}

/** Who the reader is to this tournament, or null when it is none of theirs. */
async function accessTo(tournament: TournamentRow, userId: string): Promise<Access | null> {
  const [access, role] = await Promise.all([
    tournamentRepository.accessOf(tournament.id, userId),
    userRepository.findRoleById(userId),
  ]);
  const participating = new Set(tournament.classes.map(({ class: c }) => c.id));
  const teamClassId = teamClassOf(access.liveMemberships, participating);
  if (teamClassId !== null) return { role: "player", teamClassId };
  if (access.teaches) return { role: "teacher", teamClassId: null };
  if (role?.role === "ADMIN") return { role: "admin", teamClassId: null };
  // A member of a class put away since: they may read the scores they played for.
  if (access.isMember) return { role: "player", teamClassId: null };
  return null;
}

/** The name a scoreboard may show for a player, or null when it may not show them. */
function playerName(solve: SolveRow, readerId: string): string | null {
  const { user } = solve;
  if (user === null) return null;
  const name = user.displayName || (user.username ?? "Sans nom");
  if (solve.userId === readerId) return name;
  const visibility = user.preferences?.leaderboardVisibility ?? LeaderboardVisibility.ANONYMOUS;
  if (visibility === LeaderboardVisibility.HIDDEN) return null;
  return visibility === LeaderboardVisibility.PUBLIC ? name : "Anonyme";
}

/** The tournaments the reader is part of, the latest first. */
export async function listTournamentsFor(
  userId: string,
  now: Date = new Date(),
): Promise<TournamentSummary[]> {
  const role = await userRepository.findRoleById(userId);
  const rows = await tournamentRepository.listVisibleTo(userId, role?.role === "ADMIN");
  return rows.map((row) =>
    summaryOf(row, { classes: row._count.classes, challenges: row._count.challenges }, now),
  );
}

/** One tournament, its challenges once started, and its scoreboard; null when not the reader's. */
export async function tournamentViewFor(
  userId: string,
  tournamentId: unknown,
  now: Date = new Date(),
): Promise<TournamentView | null> {
  const id = uuid.safeParse(tournamentId);
  if (!id.success) return null;
  const tournament = await tournamentRepository.findById(id.data);
  if (tournament === null) return null;
  const access = await accessTo(tournament, userId);
  if (access === null) return null;

  const phase = tournamentPhase(tournament, now);
  const { teams, teamOfClass } = teamsOf(tournament);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const myTeamId =
    access.teamClassId === null ? null : (teamOfClass.get(access.teamClassId) ?? null);
  const solves = phase === "UPCOMING" ? [] : await tournamentRepository.listSolves(tournament.id);

  const rows: TournamentSolveRow[] = solves.flatMap((solve) => {
    const teamId = teamOfClass.get(solve.classId);
    return teamId === undefined
      ? []
      : [
          {
            challengeId: solve.challengeId,
            userId: solve.userId,
            teamId,
            points: solve.points,
            solvedAt: solve.solvedAt,
          },
        ];
  });

  const standings = teamStandings(
    teams.map((t) => t.id),
    rows,
  );
  const teamRows: TournamentTeamRow[] = standings.map((s) => ({
    rank: s.rank,
    name: teamName.get(s.teamId) ?? "",
    detail: teams.find((t) => t.id === s.teamId)?.detail ?? "",
    points: s.points,
    solved: s.solved,
    isMine: s.teamId === myTeamId,
  }));

  // The players the board may name: the hidden ones are left out before the
  // ranks are counted, so they leave no gap in them.
  const nameOf = new Map<string, string>();
  for (const solve of solves) {
    if (solve.userId === null || nameOf.has(solve.userId)) continue;
    const name = playerName(solve, userId);
    if (name !== null) nameOf.set(solve.userId, name);
  }
  const ranked = playerStandings(rows.filter((r) => r.userId !== null && nameOf.has(r.userId)));
  const players: TournamentPlayerRow[] = ranked.slice(0, PLAYER_ROWS).map((p) => ({
    rank: p.rank,
    name: nameOf.get(p.userId) ?? "Anonyme",
    team: teamName.get(p.teamId) ?? "",
    points: p.points,
    solved: p.solved,
    isMe: p.userId === userId,
  }));

  const mine = rows.filter((r) => r.userId === userId);
  const me: TournamentMe | null =
    access.role === "player"
      ? {
          points: mine.reduce((sum, r) => sum + r.points, 0),
          solved: mine.length,
          rank: ranked.find((p) => p.userId === userId)?.rank ?? null,
        }
      : null;

  const firsts = firstSolves(rows);
  const challenges: TournamentChallengeRow[] =
    phase === "UPCOMING"
      ? []
      : tournament.challenges.map(({ points, challenge }) => {
          const found = rows.filter((r) => r.challengeId === challenge.id);
          const first = firsts.get(challenge.id);
          return {
            id: challenge.id,
            slug: challenge.slug,
            title: challenge.title,
            category: challenge.category,
            difficulty: challenge.difficulty,
            type: challenge.type,
            points,
            solvedByMe: found.some((r) => r.userId === userId),
            solvedByMyTeam: myTeamId !== null && found.some((r) => r.teamId === myTeamId),
            solveCount: found.length,
            firstTeam: first === undefined ? null : (teamName.get(first.teamId) ?? null),
          };
        });

  return {
    ...summaryOf(
      tournament,
      { classes: tournament.classes.length, challenges: tournament.challenges.length },
      now,
    ),
    description: tournament.description,
    serverNow: now.toISOString(),
    role: access.role,
    myTeam: myTeamId === null ? null : (teamName.get(myTeamId) ?? null),
    canPlay: myTeamId !== null && phase === "RUNNING",
    challenges,
    teams: teamRows,
    players,
    me,
  };
}

/**
 * One challenge of a tournament, to play: hidden before the start, readable
 * after the end, played only by someone standing for a team while it runs.
 */
export async function tournamentChallengeFor(
  userId: string,
  tournamentId: unknown,
  slug: unknown,
  now: Date = new Date(),
): Promise<TournamentChallengePage | null> {
  const id = uuid.safeParse(tournamentId);
  const challengeSlug = slugSchema.safeParse(slug);
  if (!id.success || !challengeSlug.success) return null;
  const tournament = await tournamentRepository.findById(id.data);
  if (tournament === null) return null;
  const phase = tournamentPhase(tournament, now);
  if (phase === "UPCOMING") return null;
  const access = await accessTo(tournament, userId);
  if (access === null) return null;
  const entry = await tournamentRepository.findChallenge(tournament.id, challengeSlug.data);
  if (entry === null) return null;

  const { teams, teamOfClass } = teamsOf(tournament);
  const myTeamId =
    access.teamClassId === null ? null : (teamOfClass.get(access.teamClassId) ?? null);
  const { challenge } = entry;
  const solved = await tournamentRepository.hasSolved(tournament.id, challenge.id, userId);

  return {
    tournament: {
      id: tournament.id,
      title: tournament.title,
      phase,
      endsAt: tournament.endsAt.toISOString(),
      serverNow: now.toISOString(),
      canPlay: myTeamId !== null && phase === "RUNNING",
      myTeam: teams.find((t) => t.id === myTeamId)?.name ?? null,
    },
    challenge: {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      instructions: challenge.instructions,
      category: challenge.category,
      difficulty: challenge.difficulty,
      type: challenge.type,
      points: entry.points,
      onMachine: challenge.machine !== null,
      starterCode: challenge.starterCode,
      attachmentUrl: challenge.attachmentUrl,
      resourceUrl: challenge.resourceUrl,
    },
    solved,
    machine: challenge.machine,
  };
}

/**
 * A flag given during a tournament: checked as the catalogue checks it (the
 * player's own flag on a machine), counted once for the player and their
 * team. No cap on attempts, a rate limit instead.
 */
export async function submitTournamentFlag(
  userId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<TournamentFlagResult> {
  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Flag invalide." };
  const limit = await checkFlagSubmission(userId);
  if (!limit.success) return { ok: false, error: "Trop d'essais : attends une minute." };

  const tournament = await tournamentRepository.findById(parsed.data.tournamentId);
  if (tournament === null) return { ok: false, error: "Tournoi introuvable." };
  const phase = tournamentPhase(tournament, now);
  if (phase === "UPCOMING") return { ok: false, error: "Le tournoi n'a pas commencé." };
  if (phase === "FINISHED") return { ok: false, error: "Le tournoi est terminé." };
  const teamClassId = (await accessTo(tournament, userId))?.teamClassId ?? null;
  if (teamClassId === null) return { ok: false, error: "Tu ne joues pas dans ce tournoi." };

  const entry = await tournamentRepository.findChallengeForFlag(
    tournament.id,
    parsed.data.challengeId,
  );
  if (entry === null || (entry.challenge.type !== "CTF" && entry.challenge.type !== "SCRIPT")) {
    return { ok: false, error: "Défi introuvable." };
  }
  if (await tournamentRepository.hasSolved(tournament.id, entry.challenge.id, userId)) {
    return { ok: true, correct: true, points: 0, already: true };
  }
  const expected = expectedFlag(entry.challenge, userId);
  if (!expected.ok) return { ok: false, error: expected.error };
  if (!flagsMatch(parsed.data.flag, expected.flag)) return { ok: true, correct: false };

  const recorded = await tournamentRepository.recordSolve({
    tournamentId: tournament.id,
    challengeId: entry.challenge.id,
    userId,
    classId: teamClassId,
    points: entry.points,
    solvedAt: now,
  });
  return recorded
    ? { ok: true, correct: true, points: entry.points, already: false }
    : { ok: true, correct: true, points: 0, already: true };
}
