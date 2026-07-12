import { useQuery } from "@tanstack/react-query";
import { computeLevel } from "@cyberlearn/lib/xp";
import { computeTier, type TierStatus } from "@cyberlearn/lib/gamification/tier";
import { supabase } from "@/lib/supabase";
import type { Category, Difficulty, ProgressStatus, Rarity } from "@/lib/db";

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
      return rows.map((l) => ({ ...l, status: statusByLesson.get(l.id) ?? null }));
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
    .upsert({ id: userId, email, displayName }, { onConflict: "id", ignoreDuplicates: true });
}
