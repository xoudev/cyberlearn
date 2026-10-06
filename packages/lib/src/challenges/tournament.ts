/**
 * The rules of a CTF tournament between classes, or between the schools they
 * belong to, kept apart from where the scores are read and written: when it is
 * on, what a challenge is worth, how the teams and the players rank. The site,
 * the console and the app read the same functions.
 *
 * A challenge counts once per team: its points go to the team the first time
 * one of its members finds the flag, the way a CTF scores teams, so a class of
 * thirty does not win on headcount alone. Every player keeps a score of their
 * own, the points of the flags they found themselves. At equal points, whoever
 * got there first ranks first.
 */

export type TournamentPhase = "UPCOMING" | "RUNNING" | "FINISHED";

export const TOURNAMENT_PHASE_LABELS: Record<TournamentPhase, string> = {
  UPCOMING: "À venir",
  RUNNING: "En cours",
  FINISHED: "Terminé",
};

/** Who plays against whom: each class, or each school with its classes together. */
export type TournamentTeamScope = "CLASS" | "ESTABLISHMENT";

export const TEAM_SCOPE_LABELS: Record<TournamentTeamScope, string> = {
  CLASS: "Classe contre classe",
  ESTABLISHMENT: "École contre école",
};

/** The window a tournament is open in, as stored. */
export interface TournamentWindow {
  startsAt: Date;
  endsAt: Date;
}

/** Open from startsAt, included, to endsAt, excluded. */
export function tournamentPhase(window: TournamentWindow, now: Date): TournamentPhase {
  const t = now.getTime();
  if (t < window.startsAt.getTime()) return "UPCOMING";
  if (t < window.endsAt.getTime()) return "RUNNING";
  return "FINISHED";
}

export const TOURNAMENT_LIMITS = {
  titleMax: 120,
  descriptionMax: 1000,
  minMinutes: 15,
  maxDays: 31,
  maxClasses: 40,
  maxChallenges: 30,
  pointsMin: 10,
  pointsMax: 1000,
} as const;

export type ChallengeDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

/** What a challenge is worth in a tournament, unless the console says otherwise. */
export const DEFAULT_TOURNAMENT_POINTS: Record<ChallengeDifficulty, number> = {
  BEGINNER: 100,
  INTERMEDIATE: 200,
  ADVANCED: 300,
  EXPERT: 500,
};

/** Why a window cannot be a tournament's, or null when it can. */
export function windowProblem(window: TournamentWindow): string | null {
  const length = window.endsAt.getTime() - window.startsAt.getTime();
  if (Number.isNaN(length)) return "Les dates ne sont pas valides.";
  if (length <= 0) return "La fin doit venir après le début.";
  if (length < TOURNAMENT_LIMITS.minMinutes * 60_000) {
    return `Un tournoi dure au moins ${String(TOURNAMENT_LIMITS.minMinutes)} minutes.`;
  }
  if (length > TOURNAMENT_LIMITS.maxDays * 86_400_000) {
    return `Un tournoi dure au plus ${String(TOURNAMENT_LIMITS.maxDays)} jours.`;
  }
  return null;
}

// ── Paris time ──────────────────────────────────────────────────────────────
// The console types a start and an end as the schools live them, in Paris
// time, through a datetime-local field that carries no zone. The server, in
// UTC, has to read it the same way whatever the season.

export const TOURNAMENT_TIMEZONE = "Europe/Paris";

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u;

/** How far Paris is ahead of UTC at `date`, in minutes: 60 in winter, 120 in summer. */
function parisOffsetMinutes(date: Date): number {
  // Built on each call rather than once for the module: the app imports this
  // file for its standings, and its engine need not build the formatter then.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOURNAMENT_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? Number.NaN);
  const wall = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return Math.round((wall - date.getTime()) / 60_000);
}

/**
 * A datetime-local value ("2026-10-16T14:00") read as Paris time, as the
 * instant it names; null when it names none. An hour that does not exist, on
 * the spring change, moves past the gap; one that happens twice, in autumn, is
 * read in winter time.
 */
export function parisLocalToDate(value: string): Date | null {
  const match = LOCAL_INPUT.exec(value);
  if (match === null) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    return null;
  }
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(asUtc);
  // 2026-02-30 or 25:00 would roll over into another day: not a date.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null;
  }
  // The offset of the wall time read as UTC is a first guess; the offset at
  // that guess settles it, the change of hour included.
  const guess = asUtc - parisOffsetMinutes(check) * 60_000;
  return new Date(asUtc - parisOffsetMinutes(new Date(guess)) * 60_000);
}

/** The other way: an instant as Paris wall time, the value a datetime-local field takes. */
export function dateToParisLocal(date: Date): string {
  return new Date(date.getTime() + parisOffsetMinutes(date) * 60_000).toISOString().slice(0, 16);
}

/** A start or an end as people read it: "vendredi 16 octobre à 14:00". */
export function tournamentDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TOURNAMENT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** What is left, at the precision it deserves: "2 j 4 h", "3 h 05 min", "12 min 30 s", "45 s". */
export function countdownLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${String(days)} j ${String(hours)} h`;
  if (hours > 0) return `${String(hours)} h ${String(minutes).padStart(2, "0")} min`;
  if (minutes > 0) return `${String(minutes)} min ${String(seconds).padStart(2, "0")} s`;
  return `${String(seconds)} s`;
}

// ── Teams ───────────────────────────────────────────────────────────────────

/** A class taking part, with the school it belongs to. */
export interface TournamentClassRef {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
}

export interface TournamentTeam {
  id: string;
  name: string;
  /** The school of a class, or the classes of a school. */
  detail: string;
}

/**
 * The teams a tournament ranks, in alphabetical order: its classes, or the
 * schools they belong to, each school with its classes together. Also which
 * team each class plays for.
 */
export function tournamentTeams(
  scope: TournamentTeamScope,
  classes: readonly TournamentClassRef[],
): { teams: TournamentTeam[]; teamOfClass: Map<string, string> } {
  const byName = (a: TournamentTeam, b: TournamentTeam): number =>
    a.name.localeCompare(b.name, "fr");
  const teamOfClass = new Map<string, string>();
  if (scope === "CLASS") {
    for (const c of classes) teamOfClass.set(c.id, c.id);
    const teams = classes.map((c) => ({ id: c.id, name: c.name, detail: c.schoolName }));
    return { teams: teams.sort(byName), teamOfClass };
  }
  const schools = new Map<string, { name: string; classes: string[] }>();
  for (const c of classes) {
    teamOfClass.set(c.id, c.schoolId);
    const school = schools.get(c.schoolId) ?? { name: c.schoolName, classes: [] };
    school.classes.push(c.name);
    schools.set(c.schoolId, school);
  }
  const teams = [...schools.entries()].map(([id, school]) => ({
    id,
    name: school.name,
    detail: [...school.classes].sort((a, b) => a.localeCompare(b, "fr")).join(", "),
  }));
  return { teams: teams.sort(byName), teamOfClass };
}

/**
 * The class a player stands for when they belong to more than one of the
 * classes taking part: the one they joined first, so it never changes during
 * the tournament. Null when they are in none.
 */
export function teamClassOf(
  memberships: readonly { classId: string; joinedAt: Date }[],
  participating: ReadonlySet<string>,
): string | null {
  let best: { classId: string; joinedAt: Date } | null = null;
  for (const membership of memberships) {
    if (!participating.has(membership.classId)) continue;
    if (
      best === null ||
      membership.joinedAt.getTime() < best.joinedAt.getTime() ||
      (membership.joinedAt.getTime() === best.joinedAt.getTime() &&
        membership.classId < best.classId)
    ) {
      best = membership;
    }
  }
  return best?.classId ?? null;
}

// ── Standings ───────────────────────────────────────────────────────────────

/** A flag found, as the standings read it. */
export interface TournamentSolveRow {
  challengeId: string;
  /** Null once the account is erased: the solve still counts for the team. */
  userId: string | null;
  /** The team it counts for: a class, or a school. */
  teamId: string;
  points: number;
  solvedAt: Date;
}

export interface TeamStanding {
  teamId: string;
  rank: number;
  points: number;
  /** Challenges the team has found. */
  solved: number;
  /** When the team reached its score, which breaks a tie. Null before its first flag. */
  reachedAt: Date | null;
}

export interface PlayerStanding {
  userId: string;
  teamId: string;
  rank: number;
  points: number;
  solved: number;
  reachedAt: Date | null;
}

interface Scored {
  points: number;
  reachedAt: Date | null;
}

function byTime(a: TournamentSolveRow, b: TournamentSolveRow): number {
  return a.solvedAt.getTime() - b.solvedAt.getTime();
}

/** More points first; at equal points, the earlier score; no score at all, last. */
function compareScores(a: Scored, b: Scored): number {
  if (a.points !== b.points) return b.points - a.points;
  // Not a subtraction of infinities: two rows without a score would compare as
  // NaN, which is neither a tie nor an order.
  if (a.reachedAt === null || b.reachedAt === null) {
    return a.reachedAt === b.reachedAt ? 0 : a.reachedAt === null ? 1 : -1;
  }
  return a.reachedAt.getTime() - b.reachedAt.getTime();
}

/** Ranks over rows already in order: tied rows share one, the next skips ("1, 2, 2, 4"). */
function withRanks<T extends Scored>(sorted: readonly T[]): (T & { rank: number })[] {
  let rank = 0;
  return sorted.map((row, i) => {
    const previous = sorted[i - 1];
    if (previous === undefined || compareScores(previous, row) !== 0) rank = i + 1;
    return { ...row, rank };
  });
}

/**
 * The teams in order. A challenge counts once for a team, at the first time one
 * of its members finds it; at equal points the team that got there first ranks
 * first. A team still without a flag is listed too, last, in the order given.
 */
export function teamStandings(
  teamIds: readonly string[],
  solves: readonly TournamentSolveRow[],
): TeamStanding[] {
  const counted = new Map<string, Map<string, TournamentSolveRow>>();
  for (const solve of [...solves].sort(byTime)) {
    const team = counted.get(solve.teamId) ?? new Map<string, TournamentSolveRow>();
    if (!team.has(solve.challengeId)) team.set(solve.challengeId, solve);
    counted.set(solve.teamId, team);
  }
  const rows = teamIds.map((teamId, order) => {
    const firsts = [...(counted.get(teamId)?.values() ?? [])];
    let reachedAt: Date | null = null;
    for (const solve of firsts) {
      if (reachedAt === null || solve.solvedAt.getTime() > reachedAt.getTime()) {
        reachedAt = solve.solvedAt;
      }
    }
    return {
      teamId,
      points: firsts.reduce((sum, solve) => sum + solve.points, 0),
      solved: firsts.length,
      reachedAt,
      order,
    };
  });
  rows.sort((a, b) => compareScores(a, b) || a.order - b.order);
  return withRanks(rows).map((row) => ({
    teamId: row.teamId,
    rank: row.rank,
    points: row.points,
    solved: row.solved,
    reachedAt: row.reachedAt,
  }));
}

/**
 * The players who found at least one flag, in order: the points of their own
 * flags, the same tie-break. An erased account is not a player any more; its
 * flags still count for its team.
 */
export function playerStandings(solves: readonly TournamentSolveRow[]): PlayerStanding[] {
  const players = new Map<
    string,
    { userId: string; teamId: string; points: number; solved: number; reachedAt: Date }
  >();
  for (const solve of [...solves].sort(byTime)) {
    if (solve.userId === null) continue;
    const player = players.get(solve.userId);
    if (player === undefined) {
      players.set(solve.userId, {
        userId: solve.userId,
        teamId: solve.teamId,
        points: solve.points,
        solved: 1,
        reachedAt: solve.solvedAt,
      });
    } else {
      player.points += solve.points;
      player.solved += 1;
      player.reachedAt = solve.solvedAt;
    }
  }
  const rows = [...players.values()].sort(
    (a, b) => compareScores(a, b) || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
  );
  return withRanks(rows);
}

/** The first solve of each challenge, by challenge: who drew first blood. */
export function firstSolves(
  solves: readonly TournamentSolveRow[],
): Map<string, TournamentSolveRow> {
  const firsts = new Map<string, TournamentSolveRow>();
  for (const solve of [...solves].sort(byTime)) {
    if (!firsts.has(solve.challengeId)) firsts.set(solve.challengeId, solve);
  }
  return firsts;
}

/** "1er", "2e", "3e": a rank as a place. */
export function placeLabel(rank: number): string {
  return rank === 1 ? "1er" : `${String(rank)}e`;
}
