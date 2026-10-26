import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { computeLevel } from "@cyberlearn/lib/xp";
import { computeTier, type TierStatus } from "@cyberlearn/lib/gamification/tier";
import {
  fetchChallengeApi,
  fetchChallengesApi,
  fetchDailyRecallApi,
  fetchLessonAccessApi,
  fetchModuleReviewApi,
  fetchLessonLocksApi,
  fetchMyRankApi,
  fetchPathCoversApi,
  type LessonAccess,
} from "@/lib/api";
import type { LessonLock } from "@/lib/lesson-locks";
import { supabase } from "@/lib/supabase";
import { readLesson, refreshLesson } from "@/lib/offline";
import { offlineStorage } from "@/lib/offline-store";
import {
  fetchExamStatusApi,
  fetchForumApi,
  fetchForumSectionApi,
  fetchForumThreadApi,
  fetchLessonQaApi,
  fetchSupportThreadApi,
  fetchSupportTicketsApi,
} from "@/lib/api";
import {
  CERTIFICATE_COUNT_COLUMN,
  CERTIFICATE_LIST_COLUMNS,
  certificateCountOf,
  type CertificateStanding,
} from "@/lib/certificates";
import { dbIso, dbIsoOrNull } from "@/lib/db-time";
import { nextNotificationOffset, notificationRange } from "@/lib/notification-pages";
import type { ExamPath, ExamStatusDto } from "@/lib/exam";
import {
  countSince,
  homePaths,
  learningGoalsOf,
  monthStart,
  type HomePath,
  type HomePaths,
} from "@/lib/home";
import type { DashboardStatsInput } from "@cyberlearn/lib/dashboard/stats";
import type { ModuleRef } from "@cyberlearn/lib/paths/modules";
import type { Category, Difficulty, ProgressStatus, Rarity } from "@/lib/db";
import { inScope, scopeFitsUrl, statusScope, type StatusFilter } from "@/lib/lesson-status";
import { countMissions, publishedLesson, type LessonLink } from "@/lib/missions";
import { progressScore, type QuizScore, type RecordedAnswer } from "@/lib/quiz";
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
  /** The path the lesson is still locked in: the card leads there, as on the site. */
  lock?: LessonLock | null;
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
  path_lessons: LessonLink[] | null;
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
    missions: countMissions(p.path_lessons),
    status: statuses.get(p.id) ?? null,
  }));
}

// ── Accueil (dashboard) ───────────────────────────────────────────────────────
// The site's dashboard, read under RLS: the paths the reader may see (the
// policy on `paths` keeps a class's own to its class), their progress, and the
// figures the shared stats module words.

export interface DashboardData {
  me: MeRow;
  level: LevelInfo;
  /** Null when the reader is not on the leaderboard. */
  rank: number | null;
  resume: { id: string; slug: string; title: string; category: Category } | null;
  inProgressTotal: number;
  badges: BadgeItem[];
  paths: HomePaths;
  stats: DashboardStatsInput;
}

interface RawHomePath {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedHours: number;
  path_modules: { id: string; position: number; title: string }[] | null;
  path_lessons: {
    position: number;
    moduleId: string | null;
    lessons: Embed<{
      id: string;
      slug: string;
      title: string;
      estimatedMinutes: number;
      status: string;
    }>;
  }[];
}

export function useDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<DashboardData> => {
      const uid = userId as string; // gated by `enabled`
      const since = monthStart(new Date()).toISOString();
      // From the server, as the site's dashboard counts it: counting the users
      // above the reader here saw only what RLS lets through and ignored the
      // board's rules, so an account off the board read "#1". A failure leaves
      // the home screen up without a rank.
      const rankPromise = fetchMyRankApi().catch(() => null);
      // The lessons the placement test waived, which the next mission passes
      // over as on the site. Without the server, none: the plain rule.
      const waivedPromise = fetchLessonAccessApi()
        .then((access) => new Set(access.waivedLessonIds))
        .catch(() => new Set<string>());
      const [
        meRes,
        completedRes,
        resumeRes,
        inProgressRes,
        badgesRes,
        badgeTotalRes,
        badgesMonthRes,
        certificatesRes,
        certifiableRes,
        pathsRes,
        statuses,
        placementRes,
        prefsRes,
      ] = await Promise.all([
        supabase.from("users").select(ME_COLUMNS).eq("id", uid).single(),
        supabase
          .from("user_lesson_progress")
          .select("lessonId,completedAt,lessons(category)")
          .eq("userId", uid)
          .eq("status", "COMPLETED")
          .order("completedAt", { ascending: false }),
        supabase
          .from("user_lesson_progress")
          .select("lastAccessedAt, lessons(id,slug,title,category)")
          .eq("userId", uid)
          .eq("status", "IN_PROGRESS")
          .order("lastAccessedAt", { ascending: false })
          .limit(1),
        supabase
          .from("user_lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("userId", uid)
          .eq("status", "IN_PROGRESS"),
        supabase
          .from("user_badges")
          .select("earnedAt, badges(name,iconUrl,rarity)")
          .eq("userId", uid)
          .order("earnedAt", { ascending: false })
          .limit(3),
        supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("userId", uid),
        supabase
          .from("user_badges")
          .select("id", { count: "exact", head: true })
          .eq("userId", uid)
          .gte("earnedAt", since),
        // On a granted column: `id` is not one, and the refusal read as 0.
        supabase
          .from("certificates")
          .select(CERTIFICATE_COUNT_COLUMN, { count: "exact", head: true })
          .eq("userId", uid)
          .is("revokedAt", null),
        // The catalogue issues certificates; a class's own path does not.
        supabase
          .from("paths")
          .select("id", { count: "exact", head: true })
          .eq("status", "PUBLISHED")
          .eq("audience", "CATALOGUE"),
        supabase
          .from("paths")
          .select(
            "id,slug,title,description,category,difficulty,estimatedHours,path_modules(id,position,title),path_lessons(position,moduleId,lessons(id,slug,title,estimatedMinutes,status))",
          )
          .eq("status", "PUBLISHED"),
        fetchPathStatuses(uid),
        supabase
          .from("user_placement_results")
          .select("devScore,cybersecScore,networkScore")
          .eq("userId", uid)
          .maybeSingle(),
        // What the reader said they came for at sign-up, as the site weighs it.
        supabase.from("user_preferences").select("learningGoals").eq("userId", uid).maybeSingle(),
      ]);

      const me = meRes.data as MeRow | null;
      if (!me) throw new Error("Profil introuvable");

      const rank = await rankPromise;
      const waived = await waivedPromise;

      // Embeds cast via `unknown` (no generated Supabase types); `one()` handles
      // the array-or-object runtime shape.
      const resumeRows = (resumeRes.data ?? []) as unknown as {
        lessons: Embed<{ id: string; slug: string; title: string; category: Category }>;
      }[];
      const resume = resumeRows.length > 0 ? one(resumeRows[0].lessons) : null;
      const badgeRows = (badgesRes.data ?? []) as unknown as { badges: Embed<BadgeItem> }[];
      const badges = badgeRows.map((b) => one(b.badges)).filter((b): b is BadgeItem => b !== null);

      // SAFETY: the columns selected above; the embed is normalised by one().
      const completedRows = (completedRes.data ?? []) as unknown as {
        lessonId: string;
        completedAt: string | null;
        lessons: Embed<{ category: Category }>;
      }[];
      const completedIds = new Set(completedRows.map((row) => row.lessonId));
      const completedThisMonth = countSince(
        completedRows.map((row) => row.completedAt),
        monthStart(new Date()),
      );

      // SAFETY: the columns selected above; embeds are normalised by one().
      const rawPaths = (pathsRes.data ?? []) as unknown as RawHomePath[];
      const homeRows: HomePath[] = rawPaths.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        category: p.category,
        difficulty: p.difficulty,
        estimatedHours: p.estimatedHours,
        status: statuses.get(p.id) ?? null,
        // Its missions, as the site's dashboard reads them: a draft or an
        // archived lesson still linked is neither counted nor offered next.
        lessons: p.path_lessons.flatMap((pl) => {
          const lesson = publishedLesson(pl.lessons);
          return lesson
            ? [
                {
                  id: lesson.id,
                  slug: lesson.slug,
                  title: lesson.title,
                  estimatedMinutes: lesson.estimatedMinutes,
                  position: pl.position,
                  moduleId: pl.moduleId,
                },
              ]
            : [];
        }),
        modules: p.path_modules ?? [],
      }));
      const placement = placementRes.data as {
        devScore: number;
        cybersecScore: number;
        networkScore: number;
      } | null;
      const level = computeLevel(me.xpTotal);

      return {
        me,
        level,
        rank,
        resume,
        inProgressTotal: inProgressRes.count ?? 0,
        badges,
        paths: homePaths(
          homeRows,
          completedIds,
          {
            level: level.level,
            placement: placement
              ? {
                  DEV: placement.devScore,
                  CYBERSEC: placement.cybersecScore,
                  NETWORK: placement.networkScore,
                }
              : null,
            // The site weighs the last twenty lessons' domains.
            recentCategories: completedRows
              .slice(0, 20)
              .map((row) => one(row.lessons)?.category)
              .filter((c): c is Category => c !== undefined),
            goals: learningGoalsOf(prefsRes.data),
          },
          resume?.id ?? null,
          waived,
        ),
        stats: {
          completedThisMonth,
          completedTotal: completedRows.length,
          streakDays: me.streakDays,
          longestStreak: me.longestStreak,
          badgesThisMonth: badgesMonthRes.count ?? 0,
          badgeTotal: badgeTotalRes.count ?? 0,
          certificateCount: certificateCountOf(certificatesRes),
          certifiablePaths: certifiableRes.count ?? 0,
        },
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
          .select("id,slug,title,description,category,difficulty,path_lessons(lessons(status))")
          .eq("status", "PUBLISHED")
          .order("title"),
        fetchPathStatuses(userId),
      ]);
      return toPathCards((pathsRes.data ?? []) as RawPath[], statuses);
    },
  });
}

/**
 * The covers of the paths this reader may open, by slug. An uploaded image is
 * signed for an hour: read again after half of it, so a card never holds an
 * expired address.
 */
export function usePathCovers(userId: string | undefined) {
  return useQuery({
    queryKey: ["path-covers", userId],
    queryFn: fetchPathCoversApi,
    enabled: userId !== undefined,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
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
  status: StatusFilter;
}

export function useLessons(userId: string | undefined, filters: LessonFilters) {
  return useQuery({
    queryKey: ["lessons", userId, filters],
    queryFn: async (): Promise<LessonCard[]> => {
      interface ProgressRow {
        lessonId: string;
        status: ProgressStatus;
        quizCorrect: number | null;
        quizTotal: number | null;
      }
      // Read first: the status filter is built from it.
      let progressRows: ProgressRow[] = [];
      if (userId) {
        const { data } = await supabase
          .from("user_lesson_progress")
          .select("lessonId,status,quizCorrect,quizTotal")
          .eq("userId", userId);
        // SAFETY: the columns selected above, in ProgressRow's shape.
        progressRows = (data ?? []) as ProgressRow[];
      }
      const progressByLesson = new Map(progressRows.map((r) => [r.lessonId, r]));

      let query = supabase
        .from("lessons")
        .select("id,slug,title,description,category,difficulty,estimatedMinutes,xpReward")
        .eq("status", "PUBLISHED");
      if (filters.category !== "ALL") query = query.eq("category", filters.category);
      if (filters.difficulty !== "ALL") query = query.eq("difficulty", filters.difficulty);
      // On the server, like the other filters, so the 60 rows below are 60
      // of the lessons asked for rather than 60 lessons filtered down after.
      // A list of ids too long for a URL is applied to the whole catalogue
      // once fetched instead.
      const scope = statusScope(filters.status, progressRows);
      if (scope.kind === "only" && scope.ids.length === 0) return [];
      const inUrl = scopeFitsUrl(scope);
      if (inUrl && scope.kind === "only") {
        query = query.in("id", scope.ids);
      } else if (inUrl && scope.kind === "except" && scope.ids.length > 0) {
        query = query.not("id", "in", `(${scope.ids.join(",")})`);
      }
      const search = sanitizeSearch(filters.search);
      if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      const ordered = query.order("publishedAt", { ascending: false });
      const lessonsRes = await (inUrl ? ordered.limit(60) : ordered);
      // SAFETY: the columns selected above, in LessonCard's shape less its status.
      const fetched = (lessonsRes.data ?? []) as Omit<LessonCard, "status">[];
      const rows = inUrl ? fetched : fetched.filter((l) => inScope(scope, l.id)).slice(0, 60);

      // Which of them are still locked in their path, as the site's catalogue
      // marks them. The server unreachable: no mark, and the lesson screen
      // asks again when one is opened.
      const locks = userId
        ? await fetchLessonLocksApi(rows.map((l) => l.id)).catch(
            () => new Map<string, LessonLock>(),
          )
        : new Map<string, LessonLock>();

      return rows.map((l) => {
        const progress = progressByLesson.get(l.id);
        return {
          ...l,
          status: progress?.status ?? null,
          quizScore: progress ? progressScore(progress) : null,
          lock: locks.get(l.id) ?? null,
        };
      });
    },
  });
}

// ── Profil ────────────────────────────────────────────────────────────────────

export interface CertificateItem extends CertificateStanding {
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
        // Revoked ones included, with their reason, as the site lists them:
        // a certificate that vanished from the list without a word read as
        // a bug, and its notice led to a tab that no longer showed it.
        supabase
          .from("certificates")
          .select(CERTIFICATE_LIST_COLUMNS)
          .eq("userId", uid)
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
        revokedAt: string | null;
        revokedReason: string | null;
        paths: Embed<{ title: string }>;
      }[];
      const certificates = certRows.map((c) => ({
        publicId: c.publicId,
        score: c.score,
        issuedAt: dbIso(c.issuedAt),
        revokedAt: dbIsoOrNull(c.revokedAt),
        revokedReason: c.revokedReason,
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

/**
 * Whether one of the reader's own certificates still stands, and the reason
 * when the console revoked it. The certificate screen is opened from the
 * profile's list and from a path's final card, which knows only the id: it
 * reads the state itself. Null for a certificate that is not the reader's,
 * which the row policy keeps out of reach anyway.
 */
export function useCertificateStanding(userId: string | undefined, publicId: string | undefined) {
  return useQuery({
    queryKey: ["certificate-standing", userId, publicId],
    enabled: Boolean(userId) && Boolean(publicId),
    queryFn: async (): Promise<CertificateStanding | null> => {
      const { data, error } = await supabase
        .from("certificates")
        .select("revokedAt,revokedReason")
        .eq("publicId", publicId as string) // gated by `enabled`
        .maybeSingle();
      if (error) throw new Error(error.message);
      // The hand-written shape of the two columns selected (no generated types).
      const row = data as CertificateStanding | null;
      if (row === null) return null;
      return { revokedAt: dbIsoOrNull(row.revokedAt), revokedReason: row.revokedReason };
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
  /** The path module the mission is filed under; null for a path without modules. */
  moduleId: string | null;
  estimatedMinutes: number;
  xpReward: number;
  status: ProgressStatus | null;
  /** Waived by the placement test: open, and opens the next, as on the site. */
  waived: boolean;
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
  /** The path's own modules, in order; empty for a path without modules. */
  modules: ModuleRef[];
  completedCount: number;
  avgRating: number | null;
  ratingsCount: number;
  /** True for an administrator: every mission is open, as on the site. */
  unlockAll: boolean;
}

export function usePathDetail(userId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["path", slug, userId],
    enabled: Boolean(slug),
    queryFn: async (): Promise<PathDetail> => {
      // Signed out, or the server unreachable: the lock stays, as for anyone.
      const locked: LessonAccess = { unlockAll: false, waivedLessonIds: [] };
      const accessPromise = userId
        ? fetchLessonAccessApi().catch(() => locked)
        : Promise.resolve(locked);
      const pathRes = await supabase
        .from("paths")
        .select(
          "id,slug,title,description,category,difficulty,estimatedHours,avgRating,ratingsCount, path_modules(id,position,title,description), path_lessons(position, moduleId, lessons(id,slug,title,estimatedMinutes,xpReward,status))",
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
        path_modules: ModuleRef[] | null;
        path_lessons: {
          position: number;
          moduleId: string | null;
          lessons: Embed<{
            id: string;
            slug: string;
            title: string;
            estimatedMinutes: number;
            xpReward: number;
            status: string;
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

      const access = await accessPromise;
      const waived = new Set(access.waivedLessonIds);
      // The published lessons only, as the site's path page draws them.
      const missions: PathMission[] = raw.path_lessons
        .map((pl) => {
          const lesson = publishedLesson(pl.lessons);
          if (!lesson) return null;
          return {
            lessonId: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            position: pl.position,
            moduleId: pl.moduleId,
            estimatedMinutes: lesson.estimatedMinutes,
            xpReward: lesson.xpReward,
            status: statusByLesson.get(lesson.id) ?? null,
            waived: waived.has(lesson.id),
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
        modules: [...(raw.path_modules ?? [])].sort((a, b) => a.position - b.position),
        completedCount: missions.filter((m) => m.status === "COMPLETED").length,
        unlockAll: access.unlockAll,
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
  /** Read from the copy saved on the phone: the network did not answer. */
  offline?: boolean;
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
      // SAFETY: the select names exactly the columns of LessonDetail but its status.
      const lesson = res.data as Omit<LessonDetail, "status"> | null;
      if (!lesson) {
        // No answer from the network (not "no such lesson", PGRST116): the copy
        // saved for reading offline, if any.
        const unreachable = res.error !== null && res.error.code !== "PGRST116";
        const saved = unreachable ? await readLesson(offlineStorage, slug ?? "") : null;
        if (saved !== null) {
          // SAFETY: a saved lesson was written from this same select.
          return { ...(saved as Omit<LessonDetail, "status">), status: null, offline: true };
        }
        throw new Error("Leçon introuvable");
      }
      // Online: a saved copy, if there is one, takes the text just read.
      void refreshLesson(offlineStorage, lesson).catch(() => undefined);

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

/**
 * The path a lesson is still locked in for the reader, or null when they may
 * read it: the lesson screen sends a locked lesson to its path, as the site's
 * lesson page does, before anything is recorded on it. The server unreachable
 * reads as no lock (the text is readable anyway, and the server refuses a
 * completion or a quiz answer on a locked lesson itself).
 */
export function useLessonLock(userId: string | undefined, lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-lock", lessonId, userId],
    enabled: Boolean(userId && lessonId),
    queryFn: async (): Promise<LessonLock | null> => {
      const id = lessonId as string; // gated by `enabled`
      try {
        return (await fetchLessonLocksApi([id])).get(id) ?? null;
      } catch {
        return null;
      }
    },
  });
}

/**
 * Mark a lesson as opened (IN_PROGRESS) - resume tracking, no XP involved.
 * Called once the lesson is known not to be locked (useLessonLock): the
 * server checks the lock again on every quiz answer and completion.
 */
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
  /** WEEKLY_BONUS is the completion bonus; the others are the quests to do. */
  type: string;
  target: number;
  xpReward: number;
  freezeReward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export function useQuests(userId: string | undefined, weekKey: string) {
  return useQuery({
    queryKey: ["quests", userId, weekKey],
    enabled: Boolean(userId),
    queryFn: async (): Promise<QuestItem[]> => {
      const [questsRes, progressRes] = await Promise.all([
        supabase
          .from("quests")
          .select("id,title,type,target,xpReward,freezeReward,orderIndex")
          .eq("isActive", true)
          .order("orderIndex"),
        supabase
          .from("user_quest_progress")
          .select("questId,progress,completed,claimed")
          .eq("userId", userId as string) // gated by `enabled`
          .eq("weekKey", weekKey),
      ]);
      const progress = new Map(
        (
          (progressRes.data ?? []) as {
            questId: string;
            progress: number;
            completed: boolean;
            claimed: boolean;
          }[]
        ).map((p) => [p.questId, p]),
      );
      return (
        (questsRes.data ?? []) as {
          id: string;
          title: string;
          type: string;
          target: number;
          xpReward: number;
          freezeReward: number;
        }[]
      ).map((q) => ({
        id: q.id,
        title: q.title,
        type: q.type,
        target: q.target,
        xpReward: q.xpReward,
        freezeReward: q.freezeReward,
        progress: progress.get(q.id)?.progress ?? 0,
        completed: progress.get(q.id)?.completed ?? false,
        claimed: progress.get(q.id)?.claimed ?? false,
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
  /**
   * What the server wrote beside it, read as unknown JSON: a friend request
   * names its sender there (`fromUserId`), which lets the notice be
   * answered in place (answerableSender).
   */
  metadata?: unknown;
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,actionUrl,readAt,createdAt,metadata")
        .eq("userId", userId as string) // gated by `enabled`
        .order("createdAt", { ascending: false })
        .limit(50);
      // A failed read is an error, not an empty inbox: the screen offers a retry.
      if (error) throw new Error(error.message);
      // SAFETY: the columns selected above, in NotificationItem's shape.
      return ((data ?? []) as NotificationItem[]).map((n) => ({
        ...n,
        readAt: dbIsoOrNull(n.readAt),
        createdAt: dbIso(n.createdAt),
      }));
    },
  });
}

/**
 * The inbox screen's history: fifty at a time, newest first, with the pages
 * after it on demand. Keyed under ["notifications", userId] like the list
 * above, so every invalidation of the inbox reaches it too.
 */
export function useNotificationHistory(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["notifications", userId, "history"],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    initialPageParam: 0,
    // Annotated: both callbacks are contextually typed, and without it the
    // pages would be inferred before queryFn says what a page holds.
    getNextPageParam: (_last: NotificationItem[], pages: NotificationItem[][]) =>
      nextNotificationOffset(pages),
    queryFn: async ({ pageParam }): Promise<NotificationItem[]> => {
      const [from, to] = notificationRange(pageParam);
      const { data, error } = await supabase
        .from("notifications")
        // metadata: a friend request names its sender there, for its notice's
        // "Accepter" and "Refuser" (answerableSender).
        .select("id,type,title,body,actionUrl,readAt,createdAt,metadata")
        .eq("userId", userId as string) // gated by `enabled`
        // The id settles two notices of the same instant, so a page boundary
        // never shows one twice or skips one.
        .order("createdAt", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      // SAFETY: the columns selected above, in NotificationItem's shape.
      return ((data ?? []) as NotificationItem[]).map((n) => ({
        ...n,
        readAt: dbIsoOrNull(n.readAt),
        createdAt: dbIso(n.createdAt),
      }));
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

/** Who sees the reader on the public board (UserPreferences.leaderboardVisibility). */
export type LeaderboardVisibility = "HIDDEN" | "ANONYMOUS" | "PUBLIC";

export interface Preferences {
  emailNotifications: boolean;
  reviewReminders: boolean;
  weeklyDigest: boolean;
  streakReminder: boolean;
  /** Spaced repetition itself: off hides the revisions, as on the site. */
  spacedRepetition: boolean;
  /** The profile page opens by link; friends get in either way. */
  publicProfile: boolean;
  /** Listed, by name, on friends' boards. Its own switch, off until turned on. */
  friendsLeaderboard: boolean;
  leaderboardVisibility: LeaderboardVisibility;
}

/** The keys that are plain switches, as opposed to the visibility choice. */
export type PreferenceSwitch = {
  [K in keyof Preferences]: Preferences[K] extends boolean ? K : never;
}[keyof Preferences];

/** The schema's defaults: what an absent row means, as on the site. */
export const DEFAULT_PREFS: Preferences = {
  emailNotifications: true,
  reviewReminders: true,
  weeklyDigest: true,
  streakReminder: true,
  spacedRepetition: true,
  publicProfile: true,
  friendsLeaderboard: false,
  leaderboardVisibility: "ANONYMOUS",
};

export function usePreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ["preferences", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Preferences> => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select(
          "emailNotifications,reviewReminders,weeklyDigest,streakReminder,spacedRepetition,publicProfile,friendsLeaderboard,leaderboardVisibility",
        )
        .eq("userId", userId as string) // gated by `enabled`
        .maybeSingle();
      // A failed read throws, so the query keeps the settings it last read.
      // Read as "no row", it put the defaults on screen, privacy included.
      if (error) throw new Error(error.message);
      return (data as Preferences | null) ?? DEFAULT_PREFS;
    },
  });
}

/** What a switch says when its write did not go through: the site's toast, word for word. */
export const PREFERENCE_NOT_SAVED =
  "Enregistrement impossible pour l'instant. Réessaie dans un moment.";

export async function updatePreference(
  userId: string,
  key: PreferenceSwitch,
  value: boolean,
): Promise<void> {
  // prefs_self_all RLS: upsert covers users without a row yet. A refused
  // write throws, so a switch can say it was not saved instead of resolving
  // as if it had been.
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ userId, [key]: value }, { onConflict: "userId" });
  if (error) throw new Error(error.message);
}

/**
 * The public board's visibility; the column is an enum, so the database
 * refuses anything else. A refused write throws, as for the switches: this is
 * a privacy choice, and a reader who picked "Masqué" must not be left
 * believing it was saved.
 */
export async function updateLeaderboardVisibility(
  userId: string,
  value: LeaderboardVisibility,
): Promise<void> {
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ userId, leaderboardVisibility: value }, { onConflict: "userId" });
  if (error) throw new Error(error.message);
}

// ── Rappel du jour et Réviser ce module ───────────────────────────────────────
// Through the site's route (/api/mobile/review-cards), never read under RLS:
// the draw, the check of each answer and the XP are the site's service.

/** The day's recall: the Révisions screen and the home tab's card share this query. */
export function dailyRecallKey(userId: string | undefined): readonly unknown[] {
  return ["rappel", userId];
}

/**
 * The day's recall, drawn on the server on its first opening of the day, as
 * the site's dashboard draws it. Spaced repetition switched off in the
 * settings comes back as `status: "off"`.
 *
 * Read again as the app comes back to the front (lib/app-focus.ts): the card
 * and the home tab's link say where the recall stands today, and the home tab
 * stays mounted overnight, so yesterday's "Fait pour aujourd'hui" would
 * otherwise stay on screen until the reader pulled the page down.
 */
export function useDailyRecall(userId: string | undefined) {
  return useQuery({
    queryKey: dailyRecallKey(userId),
    enabled: Boolean(userId),
    refetchOnWindowFocus: true,
    queryFn: fetchDailyRecallApi,
  });
}

/** "Réviser ce module": six questions at most from the module's lessons finished. */
export function useModuleReview(
  userId: string | undefined,
  slug: string | undefined,
  moduleNumber: number,
) {
  return useQuery({
    queryKey: ["module-review", slug, moduleNumber, userId],
    enabled: Boolean(userId && slug) && Number.isInteger(moduleNumber) && moduleNumber > 0,
    queryFn: () => fetchModuleReviewApi(slug as string, moduleNumber), // gated by `enabled`
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
            updatedAt: dbIso(n.updatedAt),
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

// ── Questions sur une leçon ───────────────────────────────────────────────────

export function useLessonQa(userId: string | undefined, lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-qa", lessonId, userId],
    enabled: Boolean(userId && lessonId),
    queryFn: () => fetchLessonQaApi(lessonId as string), // gated by `enabled`
  });
}

// ── Aide & demandes ───────────────────────────────────────────────────────────

export function useSupportTickets(userId: string | undefined) {
  return useQuery({
    queryKey: ["support", userId],
    enabled: Boolean(userId),
    queryFn: fetchSupportTicketsApi,
  });
}

export function useSupportThread(userId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: ["support-thread", id, userId],
    enabled: Boolean(userId && id),
    queryFn: () => fetchSupportThreadApi(id as string), // gated by `enabled`
  });
}

/** The site's /challenges: the active challenges with where the learner stands. */
export function useChallenges(userId: string | undefined) {
  return useQuery({
    queryKey: ["challenges", userId],
    enabled: Boolean(userId),
    queryFn: fetchChallengesApi,
  });
}

/** One challenge, for its screen. */
export function useChallenge(userId: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["challenge", slug, userId],
    enabled: Boolean(userId && slug),
    queryFn: () => fetchChallengeApi(slug as string), // gated by `enabled`
  });
}
