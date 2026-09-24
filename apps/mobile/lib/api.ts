import { isInvalidRefreshTokenError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";

// Thin client for the web app's mobile API routes (apps/web/app/api/mobile/*).
// Overridable via EXPO_PUBLIC_SITE_URL for local dev against localhost:3000.
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://cyberlearn.fr";

function requestWithToken(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SITE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

/** Authenticated fetch that refreshes and retries once after an expired JWT. */
async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Non authentifié");

  const response = await requestWithToken(path, token, init);
  if (response.status !== 401) return response;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error && isInvalidRefreshTokenError(error)) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  const refreshedToken = refreshed.session?.access_token;
  if (error || !refreshedToken) throw new Error("Session expirée");

  return requestWithToken(path, refreshedToken, init);
}

function readActionResponse(value: unknown): { ok: boolean; error?: string } {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return { ok: false, error: "Réponse serveur invalide." };
  }

  const ok = value.ok === true;
  const error = "error" in value && typeof value.error === "string" ? value.error : undefined;
  return error ? { ok, error } : { ok };
}

export async function updatePasswordApi(input: {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await authedFetch("/api/mobile/password", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return readActionResponse(await response.json());
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

// ── Lesson completion (guarded server flow: XP, streak, badges, quests) ───────

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newBadges: { name: string; rarity: string; xpReward: number }[];
  /** Right answers out of the lesson's quizzes, fixed at completion. */
  quizScore?: { correct: number; total: number } | null;
}

export type RatePathReply =
  | { ok: true; avgRating: number | null; ratingsCount: number }
  | { ok: false; error: string };

/**
 * Rates a path (1 to 5, and a comment for the team). The server checks that
 * one of its lessons is completed and recomputes the path's average.
 */
export async function ratePathApi(
  pathId: string,
  score: number,
  feedback?: string,
): Promise<RatePathReply> {
  try {
    const res = await authedFetch("/api/mobile/rating", {
      method: "POST",
      body: JSON.stringify({ pathId, score, ...(feedback ? { feedback } : {}) }),
    });
    return (await res.json()) as RatePathReply;
  } catch {
    return { ok: false, error: "Ta note n'a pas pu être envoyée. Réessaie." };
  }
}

/** The signed-in user's own rating of a path, or null. */
export async function fetchMyPathRating(
  pathId: string,
): Promise<{ score: number; feedback: string | null } | null> {
  try {
    const res = await authedFetch(`/api/mobile/rating?pathId=${encodeURIComponent(pathId)}`);
    const body = (await res.json()) as {
      ok: boolean;
      score?: number | null;
      feedback?: string | null;
    };
    return body.ok && body.score ? { score: body.score, feedback: body.feedback ?? null } : null;
  } catch {
    return null;
  }
}

export type QuizAnswerReply =
  | { ok: true; selected: number; correct: boolean }
  | { ok: false; error: string };

/**
 * Records the answer to one quiz. The first answer is the only one: the reply
 * is the answer on record, which is an earlier one if the quiz was already
 * answered, on this device or on the site. Whether it is right is decided by
 * the server, from the lesson.
 */
export async function answerQuizApi(
  lessonId: string,
  quizId: string,
  selected: number,
): Promise<QuizAnswerReply> {
  try {
    const res = await authedFetch("/api/mobile/quiz-answer", {
      method: "POST",
      body: JSON.stringify({ lessonId, quizId, selected }),
    });
    const body = (await res.json()) as QuizAnswerReply;
    return body;
  } catch {
    return { ok: false, error: "Ta réponse n'a pas pu être enregistrée. Réessaie." };
  }
}

export type QuizReportReply = { ok: true } | { ok: false; error: string };

/** Reports a lesson quiz, through the site's service (checks, rate limit). */
export async function reportQuizApi(
  lessonId: string,
  quizId: string,
  reason: string,
  comment: string,
): Promise<QuizReportReply> {
  try {
    const res = await authedFetch("/api/mobile/quiz-report", {
      method: "POST",
      body: JSON.stringify({ lessonId, quizId, reason, comment }),
    });
    return (await res.json()) as QuizReportReply;
  } catch {
    return { ok: false, error: "Le signalement n'a pas pu être envoyé. Réessaie." };
  }
}

export async function completeLessonApi(lessonId: string): Promise<CompleteLessonResult | null> {
  try {
    const res = await authedFetch("/api/mobile/progress", {
      method: "POST",
      body: JSON.stringify({ lessonId }),
    });
    const body = (await res.json()) as { ok: boolean; result?: CompleteLessonResult };
    return body.ok && body.result ? body.result : null;
  } catch {
    return null;
  }
}

// ── Leaderboard (leaderboard + league pod, anonymization applied server-side) ──

export interface LeaderboardEntry {
  rank: number;
  isCurrentUser: boolean;
  displayName: string | null;
  username: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
}

export interface PodEntry {
  rank: number;
  isCurrentUser: boolean;
  displayName: string | null;
  username: string | null;
  level: number;
  seasonXp: number;
  promotion: boolean;
  relegation: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userRank: number;
  league: {
    division: string;
    pod: number;
    seasonEndsAt: string;
    ladder: PodEntry[];
  } | null;
}

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  const res = await authedFetch("/api/mobile/leaderboard");
  const body = (await res.json()) as ({ ok: true } & LeaderboardData) | { ok: false };
  if (!body.ok) throw new Error("Chargement impossible");
  return { entries: body.entries, userRank: body.userRank, league: body.league };
}

// ── Locker (cosmetics loadout - guarded ownership check server-side) ──────────

export type CosmeticSlot = "TERMINAL_THEME" | "HEXAGON_STYLE" | "PROFILE_FRAME" | "ACCENT_COLOR";

export async function equipCosmetic(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authedFetch("/api/mobile/loadout", {
      method: "POST",
      body: JSON.stringify({ action: "equip", code }),
    });
    return readActionResponse(await res.json());
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

export async function unequipCosmetic(
  type: CosmeticSlot,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authedFetch("/api/mobile/loadout", {
      method: "POST",
      body: JSON.stringify({ action: "unequip", type }),
    });
    return readActionResponse(await res.json());
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

// ── My class (work set for this learner, with deadlines) ─────────────────────

export interface ClassSummary {
  id: string;
  name: string;
  establishment: string;
  promotion: string;
  teachers: { name: string; subject: string | null }[];
  memberCount: number;
}

export interface ClassWorkItem {
  lessonId: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  instructions: string | null;
  /** ISO string, or null for work with no deadline. */
  dueAt: string | null;
  done: boolean;
}

export interface MyClassData {
  classes: ClassSummary[];
  work: ClassWorkItem[];
}

/**
 * The learner's classes and everything set for them.
 *
 * One call rather than one per class: a student is in one class, occasionally
 * two, and three round trips on a phone network to answer "what do I owe" is
 * three chances to show a spinner.
 */
export async function fetchMyClass(): Promise<MyClassData> {
  const res = await authedFetch("/api/mobile/my-class");
  const body = (await res.json()) as ({ ok: true } & MyClassData) | { ok: false };
  if (!body.ok) throw new Error("Chargement impossible");
  return { classes: body.classes, work: body.work };
}

/**
 * The signed URL for the caller's own uploaded avatar, or null.
 *
 * Only worth calling when the stored value is an upload marker: a glyph, a
 * built-in preset and an empty avatar are all things the app can already draw
 * from the row it read itself.
 */
export async function fetchMyAvatarUrl(): Promise<string | null> {
  const res = await authedFetch("/api/mobile/avatar");
  const body = (await res.json()) as { ok: true; avatarUrl: string | null } | { ok: false };
  if (!body.ok) return null;
  return body.avatarUrl;
}
