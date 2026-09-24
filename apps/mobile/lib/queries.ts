import { useQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { computeLevel } from "@cyberlearn/lib/xp";
import { computeTier, type TierStatus } from "@cyberlearn/lib/gamification/tier";
import { supabase } from "@/lib/supabase";
import {
  fetchExamStatusApi,
  fetchForumApi,
  fetchForumSectionApi,
  fetchForumThreadApi,
} from "@/lib/api";
import type { ExamPath, ExamStatusDto } from "@/lib/exam";
import type { Category, Difficulty, ProgressStatus, Rarity } from "@/lib/db";
import { progressScore, type QuizScore, type RecordedAnswer } from "@/lib/quiz";
import { REVIEW_COLUMNS, toReviewItems, type RawReviewRow, type ReviewItem } from "@/lib/revisions";
import {
  GUIDE_PATH_COLUMNS,
  toGuidePaths,
  type GuidePath,
  type RawGuidePath,
} from "@/lib/path-guide";

// Prisma's @default(uuid()) generates ids CLIENT-side, so these tables have
// `id UUID NOT NULL` with no database default. Direct PostgREST inserts must
// therefore provide the id themselves (server writes go through Prisma).

// We do not ship generated Supabase types, so raw query rows are cast to these
// hand-written shapes (documented `as` casts). Tables snake_case, columns camelCase.

export interface MeRow {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  xpTotal: number;
  level: number;
  streakDays: number;
  longestStreak: number;
}

export interface PathCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  missions: number;
  status: ProgressStatus | null;
}

export interface LessonCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedMinutes: number;
  xpReward: number;
  status: ProgressStatus | null;
  /** A completed lesson's quiz score, when one was recorded. */
  quizScore?: QuizScore | null;
}

export interface BadgeItem {
  name: string;
  iconUrl: string;
  rarity: Rarity;
}

export interface LevelInfo {
  level: number;
  current: number;
  needed: number;
}

const ME_COLUMNS = "id,displayName,username,avatarUrl,xpTotal,level,streakDays,longestStreak";

// Supabase-js cannot infer to-one embed cardinality without generated Database
// types, so an embedded relation may type (and occasionally return) as an array.
// Normalize to a single row at runtime.
type Embed<T> = T | T[] | null | undefined;
function one<T>(value: Embed<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function sanitizeSearch(s: string): string {
  // Strip PostgREST filter meta-chars so user input can't break the or() string.
  return s.replace(/[,()%*]/g, " ").trim();
}

interface RawPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  path_lessons: { lessonId: string }[] | null;
}

async function fetchPathStatuses(userId: string | undefined): Promise<Map<string, ProgressStatus>> {
  if (!userId) return new Map();
  const { data } = await supabase
    .from("user_path_progress")
    .select("pathId,status")
    .eq("userId", userId);
  const rows = (data ?? []) as { pathId: string; status: ProgressStatus }[];
  return new Map(rows.map((r) => [r.pathId, r.status]));
}

function toPathCards(rows: RawPath[], statuses: Map<string, ProgressStatus>): PathCard[] {
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    category: p.category,
    difficulty: p.difficulty,
    missions: p.path_lessons?.length ?? 0,
    status: statuses.get(p.id) ?? null,
  }));
}

// ── Accueil (dashboard) ───────────────────────────────────────────────────────

export interface DashboardData {
  me: MeRow;
  level: LevelInfo;
  rank: number;
  completed: number;
  resume: { slug: string; title: string; category: Category } | null;
  badges: BadgeItem[];
  suggestedPaths: PathCard[];
}

export function useDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<DashboardData> => {
      const uid = userId as string; // gated by `enabled`
      const [meRes, completedRes, resumeRes, badgesRes, pathsRes, statuses] = await Promise.all([
        supabase.from("users").select(ME_COLUMNS).eq("id", uid).single(),
        supabase
          .from("user_lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("userId", uid)
          .eq("status", "COMPLETED"),
        supabase
          .from("user_lesson_progress")
          .select("lastAccessedAt, lessons(slug,title,category)")
          .eq("userId", uid)
          .eq("status", "IN_PROGRESS")
          .order("lastAccessedAt", { ascending: false })
          .limit(1),
        supabase
          .from("user_badges")
          .select("earnedAt, badges(name,iconUrl,rarity)")
          .eq("userId", uid)
          .order("earnedAt", { ascending: false })
          .limit(3),
        supabase
          .from("paths")
          .select("id,slug,title,description,category,difficulty,path_lessons(lessonId)")
          .eq("status", "PUBLISHED")
          .order("createdAt", { ascending: false })
          .limit(6),
        fetchPathStatuses(uid),
      ]);

      const me = meRes.data as MeRow | null;
      if (!me) throw new Error("Profil introuvable");

      const rankRes = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gt("xpTotal", me.xpTotal);

      // Embeds cast via `unknown` (no generated Supabase types); `one()` handles
      // the array-or-object runtime shape.
      const resumeRows = (resumeRes.data ?? []) as unknown as {
        lessons: Embed<{ slug: string; title: string; category: Category }>;
      }[];
      const resume = resumeRows.length > 0 ? one(resumeRows[0].lessons) : null;
      const badgeRows = (badgesRes.data ?? []) as unknown as { badges: Embed<BadgeItem> }[];
      const badges = badgeRows.map((b) => one(b.badges)).filter((b): b is BadgeItem => b !== null);

      return {
        me,
        level: computeLevel(me.xpTotal),
        rank: (rankRes.count ?? 0) + 1,
        completed: completedRes.count ?? 0,
        resume,
        badges,
        suggestedPaths: toPathCards((pathsRes.data ?? []) as RawPath[], statuses),
      };
    },
  });
}

// ── Parcours (paths catalog) ──────────────────────────────────────────────────

export function usePaths(userId: string | undefined) {
  return useQuery({
    queryKey: ["paths", userId],
    queryFn: async (): Promise<PathCard[]> => {
      const [pathsRes, statuses] = await Promise.all([
        supabase
          .from("paths")
          .select("id,slug,title,description,category,difficulty,path_lessons(lessonId)")
          .eq("status", "PUBLISHED")
          .order("title"),
        fetchPathStatuses(userId),
      ]);
      return toPathCards((pathsRes.data ?? []) as RawPath[], statuses);
    },
  });
}

/** The catalogue's published paths, for the guide. A class's own paths are not suggested. */
export function useGuidePaths() {
  return useQuery({
    queryKey: ["guide-paths"],
    queryFn: async (): Promise<GuidePath[]> => {
      const { data, error } = await supabase
        .from("paths")
        .select(GUIDE_PATH_COLUMNS)
        .eq("status", "PUBLISHED")
        .eq("audience", "CATALOGUE");
      if (error) throw new Error(error.message);
      // SAFETY: the columns selected above, in RawGuidePath's shape.
      return toGuidePaths((data ?? []) as unknown as RawGuidePath[]);
    },
  });
}

// ── Lecons (lessons catalog) ──────────────────────────────────────────────────

export interface LessonFilters {
  search: string;
  category: Category | "ALL";
  difficulty: Difficulty | "ALL";
}

export function useLessons(userId: string | undefined, filters: LessonFilters) {
  return useQuery({
    queryKey: ["lessons", userId, filters],
    queryFn: async (): Promise<LessonCard[]> => {
      let query = supabase
        .from("lessons")
        .select("id,slug,title,description,category,difficulty,estimatedMinutes,xpReward")
        .eq("status", "PUBLISHED");
      if (filters.category !== "ALL") query = query.eq("category", filters.category);
      if (filters.difficulty !== "ALL") query = query.eq("difficulty", filters.difficulty);
      const search = sanitizeSearch(filters.search);
      if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      const lessonsRes = await query.order("publishedAt", { ascending: false }).limit(60);
      const rows = (lessonsRes.data ?? []) as Omit<LessonCard, "status">[];

      type ProgressRow = {
        lessonId: string;
        status: ProgressStatus;
        quizCorrect: number | null;
        quizTotal: number | null;
      };
      let progressByLesson = new Map<string, ProgressRow>();
      if (userId) {
        const { data } = await supabase
          .from("user_lesson_progress")
          .select("lessonId,status,quizCorrect,quizTotal")
          .eq("userId", userId);
        progressByLesson = new Map(((data ?? []) as ProgressRow[]).map((r) => [r.lessonId, r]));
      }
      return rows.map((l) => {
        const progress = progressByLesson.get(l.id);
        return {
          ...l,
          status: progress?.status ?? null,
          quizScore: progress ? progressScore(progress) : null,
        };
      });
    },
  });
}

// ── Profil ────────────────────────────────────────────────────────────────────

export interface CertificateItem {
  publicId: string;
  score: number | null;
  issuedAt: string;
  pathTitle: string;
}

export interface ProfileData {
  me: MeRow;
  level: LevelInfo;
  tier: TierStatus;
  completed: number;
  badges: BadgeItem[];
  certificates: CertificateItem[];
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfileData> => {
      const uid = userId as string; // gated by `enabled`
      const [meRes, badgesRes, completedRes, certsRes] = await Promise.all([
        supabase.from("users").select(ME_COLUMNS).eq("id", uid).single(),
        supabase
          .from("user_badges")
          .select("earnedAt, badges(name,iconUrl,rarity)")
          .eq("userId", uid)
          .order("earnedAt", { ascending: false }),
        supabase
          .from("user_lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("userId", uid)
          .eq("status", "COMPLETED"),
        supabase
          .from("certificates")
          .select("publicId,score,issuedAt, paths(title)")
          .eq("userId", uid)
          .is("revokedAt", null)
          .order("issuedAt", { ascending: false }),
      ]);

      const me = meRes.data as MeRow | null;
      if (!me) throw new Error("Profil introuvable");
      const level = computeLevel(me.xpTotal);
      const badgeRows = (badgesRes.data ?? []) as unknown as { badges: Embed<BadgeItem> }[];
      const badges = badgeRows.map((b) => one(b.badges)).filter((b): b is BadgeItem => b !== null);
      const certRows = (certsRes.data ?? []) as unknown as {
        publicId: string;
        score: number | null;
        issuedAt: string;
        paths: Embed<{ title: string }>;
      }[];
      const certificates = certRows.map((c) => ({
        publicId: c.publicId,
        score: c.score,
        issuedAt: c.issuedAt,
        pathTitle: one(c.paths)?.title ?? "Parcours",
      }));

      return {
        me,
        level,
        tier: computeTier(level.level),
        completed: completedRes.count ?? 0,
        badges,
        certificates,
      };
    },
  });
}

/** Ensure a public.users row exists for a freshly-authenticated user. */
export async function ensureUserRow(
  userId: string,
  email: string,
  displayName: string,
): Promise<void> {
  // RLS `users_insert_self` allows a client to insert only its own row.
  await supabase
    .from("users")
    .upsert(
      { id: userId, email, displayName, updatedAt: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: true },
    );
}

// ── Path detail (missions timeline) ───────────────────────────────────────────

export interface PathMission {
  lessonId: string;
  slug: string;
  title: string;
  position: number;
  estimatedMinutes: number;
  xpReward: number;
  status: ProgressStatus | null;
}

export interface PathDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedHours: number;
  missions: PathMission[];
  completedCount: number;
  avgRating: number | null;
  ratingsCount: number;
}

export function usePathDetail(userId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["path", slug, userId],
    enabled: Boolean(slug),
    queryFn: async (): Promise<PathDetail> => {
      const pathRes = await supabase
        .from("paths")
        .select(
          "id,slug,title,description,category,difficulty,estimatedHours,avgRating,ratingsCount, path_lessons(position, lessons(id,slug,title,estimatedMinutes,xpReward))",
        )
        .eq("slug", slug as string) // gated by `enabled`
        .eq("status", "PUBLISHED")
        .single();
      const raw = pathRes.data as unknown as {
        id: string;
        slug: string;
        title: string;
        description: string;
        category: Category;
        difficulty: Difficulty;
        estimatedHours: number;
        avgRating: number | null;
        ratingsCount: number;
        path_lessons: {
          position: number;
          lessons: Embed<{
            id: string;
            slug: string;
            title: string;
            estimatedMinutes: number;
            xpReward: number;
          }>;
        }[];
      } | null;
      if (!raw) throw new Error("Parcours introuvable");

      let statusByLesson = new Map<string, ProgressStatus>();
      if (userId) {
        const { data } = await supabase
          .from("user_lesson_progress")
          .select("lessonId,status")
          .eq("userId", userId);
        statusByLesson = new Map(
          ((data ?? []) as { lessonId: string; status: ProgressStatus }[]).map((r) => [
            r.lessonId,
            r.status,
          ]),
        );
      }

      const missions: PathMission[] = raw.path_lessons
        .map((pl) => {
          const lesson = one(pl.lessons);
          if (!lesson) return null;
          return {
            lessonId: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            position: pl.position,
            estimatedMinutes: lesson.estimatedMinutes,
            xpReward: lesson.xpReward,
            status: statusByLesson.get(lesson.id) ?? null,
          };
        })
        .filter((m): m is PathMission => m !== null)
        .sort((a, b) => a.position - b.position);

      return {
        id: raw.id,
        slug: raw.slug,
        title: raw.title,
        description: raw.description,
        category: raw.category,
        difficulty: raw.difficulty,
        estimatedHours: raw.estimatedHours,
        avgRating: raw.avgRating,
        ratingsCount: raw.ratingsCount,
        missions,
        completedCount: missions.filter((m) => m.status === "COMPLETED").length,
      };
    },
  });
}

// ── Lesson detail (native reader) ─────────────────────────────────────────────

export interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  estimatedMinutes: number;
  xpReward: number;
  contentMdx: string;
  status: ProgressStatus | null;
}

export function useLessonDetail(userId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["lesson", slug, userId],
    enabled: Boolean(slug),
    queryFn: async (): Promise<LessonDetail> => {
      const res = await supabase
        .from("lessons")
        .select("id,slug,title,category,difficulty,estimatedMinutes,xpReward,contentMdx")
        .eq("slug", slug as string) // gated by `enabled`
        .eq("status", "PUBLISHED")
        .single();
      const lesson = res.data as Omit<LessonDetail, "status"> | null;
      if (!lesson) throw new Error("Leçon introuvable");

      let status: ProgressStatus | null = null;
      if (userId) {
        const { data } = await supabase
          .from("user_lesson_progress")
          .select("status")
          .eq("userId", userId)
          .eq("lessonId", lesson.id)
          .maybeSingle();
        status = (data as { status: ProgressStatus } | null)?.status ?? null;
      }
      return { ...lesson, status };
    },
  });
}

/**
 * The quiz answers already on record for a lesson, keyed by quiz id: an
 * answered question is shown answered, and is never asked twice. Read under
 * RLS, which only returns the reader's own answers.
 */
/** The questions of a lesson this learner reported, still open (RLS: own rows). */
export async function fetchOpenQuizReports(userId: string, lessonId: string): Promise<string[]> {
  const { data } = await supabase
    .from("quiz_reports")
    .select("quizId")
    .eq("userId", userId)
    .eq("lessonId", lessonId)
    .eq("status", "OPEN");
  return ((data ?? []) as { quizId: string }[]).map((r) => r.quizId);
}

export async function fetchLessonQuizAnswers(
  userId: string,
  lessonId: string,
): Promise<Record<string, RecordedAnswer>> {
  const { data } = await supabase
    .from("lesson_quiz_answers")
    .select("quizId,selected,correct")
    .eq("userId", userId)
    .eq("lessonId", lessonId);
  return Object.fromEntries(
    ((data ?? []) as { quizId: string; selected: number; correct: boolean }[]).map((a) => [
      a.quizId,
      { selected: a.selected, correct: a.correct },
    ]),
  );
}

/** Mark a lesson as opened (IN_PROGRESS) - resume tracking, no XP involved. */
export async function markLessonOpened(userId: string, lessonId: string): Promise<void> {
  // RLS self insert/update permits this; COMPLETED rows are left untouched.
  const { data } = await supabase
    .from("user_lesson_progress")
    .select("id,status")
    .eq("userId", userId)
    .eq("lessonId", lessonId)
    .maybeSingle();
  const existing = data as { id: string; status: ProgressStatus } | null;
  const now = new Date().toISOString();
  if (!existing) {
    await supabase
      .from("user_lesson_progress")
      .insert({ id: randomUUID(), userId, lessonId, status: "IN_PROGRESS", lastAccessedAt: now });
  } else if (existing.status !== "COMPLETED") {
    await supabase
      .from("user_lesson_progress")
      .update({ lastAccessedAt: now })
      .eq("id", existing.id);
  }
}

// ── Weekly quests (dashboard) ─────────────────────────────────────────────────

export interface QuestItem {
  id: string;
  title: string;
  target: number;
  xpReward: number;
  progress: number;
  completed: boolean;
}

export function useQuests(userId: string | undefined, weekKey: string) {
  return useQuery({
    queryKey: ["quests", userId, weekKey],
    enabled: Boolean(userId),
    queryFn: async (): Promise<QuestItem[]> => {
      const [questsRes, progressRes] = await Promise.all([
        supabase
          .from("quests")
          .select("id,title,target,xpReward,orderIndex")
          .eq("isActive", true)
          .order("orderIndex"),
        supabase
          .from("user_quest_progress")
          .select("questId,progress,completed")
          .eq("userId", userId as string) // gated by `enabled`
          .eq("weekKey", weekKey),
      ]);
      const progress = new Map(
        (
          (progressRes.data ?? []) as { questId: string; progress: number; completed: boolean }[]
        ).map((p) => [p.questId, p]),
      );
      return (
        (questsRes.data ?? []) as {
          id: string;
          title: string;
          target: number;
          xpReward: number;
        }[]
      ).map((q) => ({
        id: q.id,
        title: q.title,
        target: q.target,
        xpReward: q.xpReward,
        progress: progress.get(q.id)?.progress ?? 0,
        completed: progress.get(q.id)?.completed ?? false,
      }));
    },
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  /** The site's page it is about; the app opens its own screen for it. */
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,body,actionUrl,readAt,createdAt")
        .eq("userId", userId as string) // gated by `enabled`
        .order("createdAt", { ascending: false })
        .limit(50);
      return (data ?? []) as NotificationItem[];
    },
  });
}

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications-unread", userId],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<number> => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("userId", userId as string) // gated by `enabled`
        .is("readAt", null);
      return count ?? 0;
    },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ readAt: new Date().toISOString() })
    .eq("userId", userId)
    .is("readAt", null);
}

// ── Preferences (settings) ────────────────────────────────────────────────────

export interface Preferences {
  emailNotifications: boolean;
  reviewReminders: boolean;
  weeklyDigest: boolean;
  streakReminder: boolean;
  /** Spaced repetition itself: off hides the revisions, as on the site. */
  spacedRepetition: boolean;
}

const DEFAULT_PREFS: Preferences = {
  emailNotifications: true,
  reviewReminders: true,
  weeklyDigest: true,
  streakReminder: true,
  spacedRepetition: true,
};

export function usePreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ["preferences", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Preferences> => {
      const { data } = await supabase
        .from("user_preferences")
        .select("emailNotifications,reviewReminders,weeklyDigest,streakReminder,spacedRepetition")
        .eq("userId", userId as string) // gated by `enabled`
        .maybeSingle();
      return (data as Preferences | null) ?? DEFAULT_PREFS;
    },
  });
}

export async function updatePreference(
  userId: string,
  key: keyof Preferences,
  value: boolean,
): Promise<void> {
  // prefs_self_all RLS: upsert covers users without a row yet.
  await supabase
    .from("user_preferences")
    .upsert({ userId, [key]: value }, { onConflict: "userId" });
}

// ── Révisions (SM-2) ──────────────────────────────────────────────────────────

export interface RevisionsData {
  /** UserPreferences.spacedRepetition: an absent row means on, as on the site. */
  enabled: boolean;
  items: ReviewItem[];
}

export function useRevisions(userId: string | undefined) {
  return useQuery({
    queryKey: ["revisions", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RevisionsData> => {
      const uid = userId as string; // gated by `enabled`
      const [prefs, schedules] = await Promise.all([
        supabase
          .from("user_preferences")
          .select("spacedRepetition")
          .eq("userId", uid)
          .maybeSingle(),
        supabase
          .from("review_schedules")
          .select(REVIEW_COLUMNS)
          .eq("userId", uid)
          .order("nextReviewAt", { ascending: true }),
      ]);
      if (schedules.error) throw new Error(schedules.error.message);
      const pref = prefs.data as { spacedRepetition: boolean } | null;
      return {
        enabled: pref?.spacedRepetition !== false,
        // SAFETY: the columns selected above, in RawReviewRow's shape.
        items: toReviewItems((schedules.data ?? []) as unknown as RawReviewRow[]),
      };
    },
  });
}

// ── Notes (bloc-notes) ────────────────────────────────────────────────────────

export interface NoteFolderItem {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  position: number;
}

export interface NoteItem {
  id: string;
  lessonId: string;
  folderId: string | null;
  content: string;
  wordCount: number;
  updatedAt: string;
  lessonTitle: string;
  lessonSlug: string;
  category: Category;
}

export function useNotes(userId: string | undefined) {
  return useQuery({
    queryKey: ["notes", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<{ folders: NoteFolderItem[]; notes: NoteItem[] }> => {
      const [foldersRes, notesRes] = await Promise.all([
        supabase
          .from("note_folders")
          .select("id,name,color,icon,position")
          .eq("userId", userId as string) // gated by `enabled`
          .order("position"),
        supabase
          .from("notes")
          .select("id,lessonId,folderId,content,wordCount,updatedAt, lessons(title,slug,category)")
          .eq("userId", userId as string) // gated by `enabled`
          .order("updatedAt", { ascending: false }),
      ]);
      const folders = (foldersRes.data ?? []) as NoteFolderItem[];
      const rawNotes = (notesRes.data ?? []) as unknown as (Omit<
        NoteItem,
        "lessonTitle" | "lessonSlug" | "category"
      > & {
        lessons: Embed<{ title: string; slug: string; category: Category }>;
      })[];
      const notes = rawNotes
        .map((n) => {
          const lesson = one(n.lessons);
          if (!lesson) return null;
          return {
            id: n.id,
            lessonId: n.lessonId,
            folderId: n.folderId,
            content: n.content,
            wordCount: n.wordCount,
            updatedAt: n.updatedAt,
            lessonTitle: lesson.title,
            lessonSlug: lesson.slug,
            category: lesson.category,
          };
        })
        .filter((n): n is NoteItem => n !== null);
      return { folders, notes };
    },
  });
}

/** Fetch my note for one lesson (editor). */
export async function fetchNoteForLesson(
  userId: string,
  lessonId: string,
): Promise<{ id: string; content: string } | null> {
  const { data } = await supabase
    .from("notes")
    .select("id,content")
    .eq("userId", userId)
    .eq("lessonId", lessonId)
    .maybeSingle();
  return data as { id: string; content: string } | null;
}

/** Create/update my note for a lesson (notes_self_insert/update RLS). */
export async function saveNoteForLesson(
  userId: string,
  lessonId: string,
  content: string,
): Promise<void> {
  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const now = new Date().toISOString();
  // Select-then-insert/update rather than upsert: the insert must carry a
  // client id (no DB default), but an upsert would overwrite it on conflict.
  const existing = await fetchNoteForLesson(userId, lessonId);
  if (existing) {
    const { error } = await supabase
      .from("notes")
      .update({ content, wordCount, updatedAt: now })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("notes")
      .insert({ id: randomUUID(), userId, lessonId, content, wordCount, updatedAt: now });
    if (error) throw new Error(error.message);
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  await supabase.from("notes").delete().eq("id", noteId);
}

// ── Locker (cosmetics) ────────────────────────────────────────────────────────

export type CosmeticType = "TERMINAL_THEME" | "HEXAGON_STYLE" | "PROFILE_FRAME" | "ACCENT_COLOR";

export interface CosmeticItem {
  id: string;
  code: string;
  type: CosmeticType;
  label: string;
  description: string | null;
  rarity: Rarity;
  owned: boolean;
  equipped: boolean;
}

export interface LockerData {
  items: CosmeticItem[];
  loadout: Record<string, string | null>;
}

const LOADOUT_BY_TYPE: Record<CosmeticType, string> = {
  TERMINAL_THEME: "terminalTheme",
  HEXAGON_STYLE: "hexagonStyle",
  PROFILE_FRAME: "profileFrame",
  ACCENT_COLOR: "accentColor",
};

export function useLocker(userId: string | undefined) {
  return useQuery({
    queryKey: ["locker", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<LockerData> => {
      const uid = userId as string; // gated by `enabled`
      const [cosmeticsRes, ownedRes, loadoutRes] = await Promise.all([
        supabase
          .from("cosmetics")
          .select("id,code,type,label,description,rarity,orderIndex")
          .eq("isActive", true)
          .order("orderIndex"),
        supabase.from("user_cosmetics").select("cosmeticId").eq("userId", uid),
        supabase
          .from("user_cosmetic_loadouts")
          .select("terminalTheme,hexagonStyle,profileFrame,accentColor")
          .eq("userId", uid)
          .maybeSingle(),
      ]);
      const ownedIds = new Set(
        ((ownedRes.data ?? []) as { cosmeticId: string }[]).map((r) => r.cosmeticId),
      );
      const loadout = (loadoutRes.data ?? {
        terminalTheme: null,
        hexagonStyle: null,
        profileFrame: null,
        accentColor: null,
      }) as Record<string, string | null>;
      const items = (
        (cosmeticsRes.data ?? []) as {
          id: string;
          code: string;
          type: CosmeticType;
          label: string;
          description: string | null;
          rarity: Rarity;
        }[]
      ).map((c) => ({
        ...c,
        owned: ownedIds.has(c.id),
        equipped: loadout[LOADOUT_BY_TYPE[c.type]] === c.code,
      }));
      return { items, loadout };
    },
  });
}

/** Mark one notification as read (tap on its row). */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ readAt: new Date().toISOString() })
    .eq("id", notificationId)
    .is("readAt", null);
}

// ── Note folders (Drive-style management, RLS self CRUD) ─────────────────────

export async function createNoteFolder(
  userId: string,
  name: string,
  color: string,
  icon: string,
  position: number,
): Promise<void> {
  const { error } = await supabase.from("note_folders").insert({
    id: randomUUID(),
    userId,
    name,
    color,
    icon,
    position,
    updatedAt: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function updateNoteFolder(
  folderId: string,
  patch: { name?: string; color?: string; icon?: string },
): Promise<void> {
  const { error } = await supabase
    .from("note_folders")
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq("id", folderId);
  if (error) throw new Error(error.message);
}

/** Delete a folder; its notes fall back to "unfiled" (FK ON DELETE SET NULL). */
export async function deleteNoteFolder(folderId: string): Promise<void> {
  const { error } = await supabase.from("note_folders").delete().eq("id", folderId);
  if (error) throw new Error(error.message);
}

export async function moveNoteToFolder(noteId: string, folderId: string | null): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({ folderId, updatedAt: new Date().toISOString() })
    .eq("id", noteId);
  if (error) throw new Error(error.message);
}

// ── Examen final d'un parcours ────────────────────────────────────────────────

/**
 * Where a path's final exam stands, from the site (GET /api/mobile/exam): the
 * answer combines the quiz, the attempts and the 48-hour rule, which the app
 * must not rewrite.
 */
export function useExamStatus(userId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["exam", slug, userId],
    enabled: Boolean(userId && slug),
    queryFn: async (): Promise<{ path: ExamPath; status: ExamStatusDto }> => {
      const reply = await fetchExamStatusApi(slug as string); // gated by `enabled`
      if (!reply.ok) throw new Error(reply.error);
      return { path: reply.path, status: reply.status };
    },
  });
}

// ── Forum ─────────────────────────────────────────────────────────────────────
// Through the site's routes rather than reads under RLS: what a reader sees
// (their own hidden posts included) is the repository's rule, and an author's
// uploaded avatar needs a signature only the server can make.

export function useForum(userId: string | undefined) {
  return useQuery({
    queryKey: ["forum", userId],
    enabled: Boolean(userId),
    queryFn: fetchForumApi,
  });
}

export function useForumSection(
  userId: string | undefined,
  slug: string | undefined,
  page: number,
) {
  return useQuery({
    queryKey: ["forum-section", slug, page, userId],
    enabled: Boolean(userId && slug),
    queryFn: () => fetchForumSectionApi(slug as string, page), // gated by `enabled`
  });
}

export function useForumThread(
  userId: string | undefined,
  category: string | undefined,
  slug: string | undefined,
  page: number,
) {
  return useQuery({
    queryKey: ["forum-thread", category, slug, page, userId],
    enabled: Boolean(userId && category && slug),
    // gated by `enabled`
    queryFn: () => fetchForumThreadApi(category as string, slug as string, page),
  });
}
