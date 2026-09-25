import { isInvalidRefreshTokenError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";
import type { ExamPath, ExamQuestion, ExamReviewItem, ExamStatusDto } from "@/lib/exam";
import type { ForumCategory, ForumPost, ForumTopicSummary } from "@/lib/forum";
import type { QaQuestion } from "@/lib/lesson-qa";

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

// ── A banned account: the two things it may still do (the site's /banned) ────

/** Records that the ban notice was seen. A failure costs a second showing, nothing else. */
export async function acknowledgeBanApi(): Promise<{ ok: boolean }> {
  try {
    const response = await authedFetch("/api/mobile/ban/acknowledge", { method: "POST" });
    return readActionResponse(await response.json());
  } catch {
    return { ok: false };
  }
}

/** Appeals the ban in force: one per decision, filed as a ticket for the moderators. */
export async function appealBanApi(message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await authedFetch("/api/mobile/ban/appeal", {
      method: "POST",
      body: JSON.stringify({ message }),
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

export type GradeReviewReply =
  | { ok: true; reviewXp: number; nextReviewAt: string }
  | { ok: false; error: string };

/** Grades a due review through the site's service (SM-2 step, XP, no double grading). */
export async function gradeReviewApi(
  scheduleId: string,
  quality: 1 | 3 | 5,
): Promise<GradeReviewReply> {
  try {
    const res = await authedFetch("/api/mobile/review", {
      method: "POST",
      body: JSON.stringify({ scheduleId, quality }),
    });
    return (await res.json()) as GradeReviewReply;
  } catch {
    return { ok: false, error: "La révision n'a pas pu être enregistrée. Réessaie." };
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

// ── Path final exam (the site's service: draw, 30-minute limit, 48 h wait) ────

export type ExamStatusReply =
  | { ok: true; path: ExamPath; status: ExamStatusDto }
  | { ok: false; error: string };

/** Where the exam of the path `slug` stands for the signed-in learner. */
export async function fetchExamStatusApi(slug: string): Promise<ExamStatusReply> {
  const res = await authedFetch(`/api/mobile/exam?slug=${encodeURIComponent(slug)}`);
  return (await res.json()) as ExamStatusReply;
}

export type StartExamReply =
  | {
      ok: true;
      attemptId: string;
      questions: ExamQuestion[];
      startedAt: string;
      /** Counted on the server's clock when it answered. */
      secondsLeft: number;
    }
  | { ok: false; error: string };

/** Starts an attempt, or resumes the one running: the server says which. */
export async function startExamApi(pathId: string): Promise<StartExamReply> {
  try {
    const res = await authedFetch("/api/mobile/exam/start", {
      method: "POST",
      body: JSON.stringify({ pathId }),
    });
    return (await res.json()) as StartExamReply;
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

export type SubmitExamReply =
  | { ok: true; score: number; passed: boolean; results: ExamReviewItem[] }
  | { ok: false; error: string };

/** Hands the copy in; the server scores it and issues the certificate on a pass. */
export async function submitExamApi(
  attemptId: string,
  answers: Readonly<Record<string, string>>,
): Promise<SubmitExamReply> {
  try {
    const res = await authedFetch("/api/mobile/exam/submit", {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    });
    return (await res.json()) as SubmitExamReply;
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

/** Claims the certificate of a finished path that has no exam. */
export async function claimCertificateApi(
  pathSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authedFetch("/api/mobile/exam/claim", {
      method: "POST",
      body: JSON.stringify({ pathSlug }),
    });
    return readActionResponse(await res.json());
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

// ── Forum (the site's service: rate limit, moderation screen, held posts) ─────

export interface ForumFront {
  categories: ForumCategory[];
  recent: ForumTopicSummary[];
}

export interface ForumSection {
  category: Omit<ForumCategory, "lastPostAt">;
  topics: ForumTopicSummary[];
  page: number;
  pages: number;
}

export interface ForumThread {
  viewer: { isAdmin: boolean };
  topic: ForumTopicSummary;
  posts: ForumPost[];
  page: number;
  pages: number;
}

/** What a write answered: `heldForReview` when the screen took it down. */
export interface ForumWriteReply {
  ok: boolean;
  error?: string;
  href?: string;
  heldForReview?: boolean;
}

async function forumRead<T>(path: string): Promise<T> {
  const res = await authedFetch(path);
  const body = (await res.json()) as ({ ok: true } & T) | { ok: false; error?: string };
  if (!body.ok) throw new Error(body.error ?? "Chargement impossible");
  return body;
}

export function fetchForumApi(): Promise<ForumFront> {
  return forumRead<ForumFront>("/api/mobile/forum");
}

export function fetchForumSectionApi(slug: string, page: number): Promise<ForumSection> {
  return forumRead<ForumSection>(
    `/api/mobile/forum/section?slug=${encodeURIComponent(slug)}&page=${String(page)}`,
  );
}

export function fetchForumThreadApi(
  category: string,
  slug: string,
  page: number,
): Promise<ForumThread> {
  return forumRead<ForumThread>(
    `/api/mobile/forum/topic?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}&page=${String(page)}`,
  );
}

async function forumWrite(path: string, body: unknown): Promise<ForumWriteReply> {
  try {
    const res = await authedFetch(path, { method: "POST", body: JSON.stringify(body) });
    return (await res.json()) as ForumWriteReply;
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

export function createForumTopicApi(input: {
  categorySlug: string;
  title: string;
  content: string;
}): Promise<ForumWriteReply> {
  return forumWrite("/api/mobile/forum/topic", input);
}

export function replyInForumApi(topicId: string, content: string): Promise<ForumWriteReply> {
  return forumWrite("/api/mobile/forum/reply", { topicId, content });
}

export function editForumPostApi(postId: string, content: string): Promise<ForumWriteReply> {
  return forumWrite("/api/mobile/forum/post/edit", { postId, content });
}

export function hideForumPostApi(postId: string): Promise<ForumWriteReply> {
  return forumWrite("/api/mobile/forum/post/hide", { postId });
}

// ── A lesson's rating and Q&A (the site's services) ───────────────────────────

/** The reader's own rating of a lesson, and the lesson's average. */
export async function fetchLessonRatingApi(lessonId: string): Promise<{
  mine: { score: number; feedback: string | null } | null;
  avgRating: number | null;
  ratingsCount: number;
}> {
  try {
    const res = await authedFetch(
      `/api/mobile/lesson-rating?lessonId=${encodeURIComponent(lessonId)}`,
    );
    const body = (await res.json()) as
      | {
          ok: true;
          score: number | null;
          feedback: string | null;
          avgRating: number | null;
          ratingsCount: number;
        }
      | { ok: false };
    if (!body.ok) return { mine: null, avgRating: null, ratingsCount: 0 };
    return {
      mine: body.score !== null ? { score: body.score, feedback: body.feedback } : null,
      avgRating: body.avgRating,
      ratingsCount: body.ratingsCount,
    };
  } catch {
    return { mine: null, avgRating: null, ratingsCount: 0 };
  }
}

/** Rates a lesson; the server checks it is completed and recomputes its average. */
export async function rateLessonApi(
  lessonId: string,
  score: number,
  feedback?: string,
): Promise<RatePathReply> {
  try {
    const res = await authedFetch("/api/mobile/lesson-rating", {
      method: "POST",
      body: JSON.stringify({ lessonId, score, ...(feedback ? { feedback } : {}) }),
    });
    return (await res.json()) as RatePathReply;
  } catch {
    return { ok: false, error: "Ta note n'a pas pu être envoyée. Réessaie." };
  }
}

export async function fetchLessonQaApi(lessonId: string): Promise<QaQuestion[]> {
  const res = await authedFetch(`/api/mobile/lesson-qa?lessonId=${encodeURIComponent(lessonId)}`);
  const body = (await res.json()) as
    | { ok: true; questions: QaQuestion[] }
    | { ok: false; error?: string };
  if (!body.ok) throw new Error(body.error ?? "Chargement impossible");
  return body.questions;
}

/** What a Q&A write answered: `heldForReview` when the screen took it down. */
export type QaWriteReply = { ok: true; heldForReview?: true } | { ok: false; error: string };

async function qaWrite(path: string, body: unknown): Promise<QaWriteReply> {
  try {
    const res = await authedFetch(path, { method: "POST", body: JSON.stringify(body) });
    return (await res.json()) as QaWriteReply;
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

export function askLessonQuestionApi(input: {
  lessonId: string;
  title: string;
  content: string;
}): Promise<QaWriteReply> {
  return qaWrite("/api/mobile/lesson-qa/question", input);
}

export function answerLessonQuestionApi(
  questionId: string,
  content: string,
): Promise<QaWriteReply> {
  return qaWrite("/api/mobile/lesson-qa/answer", { questionId, content });
}

export function acceptLessonAnswerApi(answerId: string): Promise<QaWriteReply> {
  return qaWrite("/api/mobile/lesson-qa/accept", { answerId });
}

export function upvoteLessonAnswerApi(answerId: string): Promise<QaWriteReply> {
  return qaWrite("/api/mobile/lesson-qa/upvote", { answerId });
}
