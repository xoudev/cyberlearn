import { z } from "zod";
import type {
  AuditFilter,
  AuditQuery,
  Category,
  ConsoleLessonFolder,
  ConsoleLessonOrigin,
  ConsoleLessonQuery,
  ConsoleLessonSort,
  ConsoleUserQuery,
  ConsoleUserSort,
  Difficulty,
  SortDir,
  UserRole,
} from "@cyberlearn/db";
import { sortValue } from "./grid-href";
import {
  dayParam,
  first,
  oneOf,
  pageParam,
  parisDayEnd,
  parisDayStart,
  searchParam,
  sortParam,
  valid,
  type GridSort,
  type RawParams,
} from "./grid-params";

/**
 * The filters of the console's three server-side lists (accounts, audit log,
 * lessons): read from the URL, written back into its links, and turned into
 * the repository's query.
 *
 * Each list has a parse, which never fails, and a search, which is the
 * opposite: the parameters a link to the same list carries, with the defaults
 * left out so a plain /users stays a plain /users.
 */

// ─── Accounts ───────────────────────────────────────────────────────────────

export const USERS_PAGE_SIZE = 25;

export const USER_ROLE_VALUES = [
  "ADMIN",
  "TEACHER",
  "STUDENT",
] as const satisfies readonly UserRole[];

export const USER_SORT_KEYS = [
  "user",
  "email",
  "role",
  "level",
  "xp",
  "streak",
  "badges",
  "created",
  "active",
] as const satisfies readonly ConsoleUserSort[];

/** Newest accounts first, as the list always opened. */
export const DEFAULT_USER_SORT: GridSort<ConsoleUserSort> = { key: "created", dir: "desc" };

export interface UserListParams {
  q: string;
  role: UserRole | undefined;
  sort: GridSort<ConsoleUserSort>;
  page: number;
}

export function parseUserListParams(raw: RawParams): UserListParams {
  return {
    q: searchParam(raw),
    role: oneOf(raw, "role", USER_ROLE_VALUES),
    sort: sortParam(raw, USER_SORT_KEYS) ?? DEFAULT_USER_SORT,
    page: pageParam(raw),
  };
}

export function userListSearch(params: UserListParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.q !== "") out.q = params.q;
  if (params.role !== undefined) out.role = params.role;
  if (params.sort.key !== DEFAULT_USER_SORT.key || params.sort.dir !== DEFAULT_USER_SORT.dir) {
    out.sort = sortValue(params.sort.key, params.sort.dir);
  }
  if (params.page > 1) out.page = String(params.page);
  return out;
}

export function userQueryOf(params: UserListParams): ConsoleUserQuery {
  return {
    q: params.q,
    role: params.role,
    sort: params.sort,
    page: params.page,
    pageSize: USERS_PAGE_SIZE,
  };
}

// ─── Pending sign-ups ───────────────────────────────────────────────────────

/** A search on the address and a page: the list has no facet and one order. */
export interface PendingListParams {
  q: string;
  page: number;
}

export function parsePendingListParams(raw: RawParams): PendingListParams {
  return { q: searchParam(raw), page: pageParam(raw) };
}

export function pendingListSearch(params: PendingListParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.q !== "") out.q = params.q;
  if (params.page > 1) out.page = String(params.page);
  return out;
}

// ─── Audit log ──────────────────────────────────────────────────────────────

export const AUDIT_PAGE_SIZE = 50;

/** What an action is named like: "admin.user.mfa_reset", "lesson.create". */
const actionSchema = z.string().regex(/^[\w.:-]{1,100}$/u);

export interface AuditListParams {
  actor: string;
  target: string;
  action: string | undefined;
  /** First day shown, "2026-10-01", read in Paris time. */
  from: string | undefined;
  /** Last day shown, included. */
  to: string | undefined;
  dir: SortDir;
  page: number;
}

export function parseAuditListParams(raw: RawParams): AuditListParams {
  return {
    actor: searchParam(raw, "actor"),
    target: searchParam(raw, "target"),
    action: valid(actionSchema, first(raw, "action")),
    from: dayParam(raw, "from"),
    to: dayParam(raw, "to"),
    dir: sortParam(raw, ["date"])?.dir ?? "desc",
    page: pageParam(raw),
  };
}

/**
 * The action filter kept only when the log holds that action: one it does not
 * know is a mistyped URL, and dropping it shows the list rather than nothing.
 */
export function withKnownAction(
  params: AuditListParams,
  known: readonly string[],
): AuditListParams {
  return params.action !== undefined && !known.includes(params.action)
    ? { ...params, action: undefined }
    : params;
}

/** The filters alone: what the page shows, and what the export writes. */
export function auditFilterOf(params: AuditListParams): AuditFilter {
  return {
    actor: params.actor,
    target: params.target,
    action: params.action,
    from: params.from !== undefined ? parisDayStart(params.from) : undefined,
    until: params.to !== undefined ? parisDayEnd(params.to) : undefined,
  };
}

export function auditQueryOf(params: AuditListParams): AuditQuery {
  return {
    filter: auditFilterOf(params),
    dir: params.dir,
    page: params.page,
    pageSize: AUDIT_PAGE_SIZE,
  };
}

export function auditListSearch(params: AuditListParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.actor !== "") out.actor = params.actor;
  if (params.target !== "") out.target = params.target;
  if (params.action !== undefined) out.action = params.action;
  if (params.from !== undefined) out.from = params.from;
  if (params.to !== undefined) out.to = params.to;
  if (params.dir === "asc") out.sort = sortValue("date", "asc");
  if (params.page > 1) out.page = String(params.page);
  return out;
}

// ─── Lessons ────────────────────────────────────────────────────────────────

export const LESSONS_PAGE_SIZE = 50;

export const LESSON_CATEGORY_VALUES = [
  "DEV",
  "CYBERSEC",
  "NETWORK",
] as const satisfies readonly Category[];

export const LESSON_DIFFICULTY_VALUES = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const satisfies readonly Difficulty[];

/** The working list's statuses: the archives are their own list. */
export const LESSON_STATUS_VALUES = ["DRAFT", "PUBLISHED"] as const;

export const LESSON_ORIGIN_VALUES = [
  "new",
  "first",
  "class",
] as const satisfies readonly ConsoleLessonOrigin[];

export const LESSON_SORT_KEYS = [
  "title",
  "category",
  "difficulty",
  "xp",
  "status",
] as const satisfies readonly ConsoleLessonSort[];

export interface LessonListParams {
  q: string;
  category: Category | undefined;
  difficulty: Difficulty | undefined;
  status: (typeof LESSON_STATUS_VALUES)[number] | undefined;
  origin: ConsoleLessonOrigin | undefined;
  /** None is the list's own order: drafts first, newest first. */
  sort: GridSort<ConsoleLessonSort> | undefined;
  page: number;
}

export function parseLessonListParams(
  raw: RawParams,
  folder: ConsoleLessonFolder,
): LessonListParams {
  return {
    q: searchParam(raw),
    category: oneOf(raw, "category", LESSON_CATEGORY_VALUES),
    difficulty: oneOf(raw, "difficulty", LESSON_DIFFICULTY_VALUES),
    // The archives hold one status, so the filter means nothing there.
    status: folder === "active" ? oneOf(raw, "status", LESSON_STATUS_VALUES) : undefined,
    origin: oneOf(raw, "origin", LESSON_ORIGIN_VALUES),
    sort: sortParam(raw, LESSON_SORT_KEYS),
    page: pageParam(raw),
  };
}

export function lessonListSearch(params: LessonListParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.q !== "") out.q = params.q;
  if (params.category !== undefined) out.category = params.category;
  if (params.difficulty !== undefined) out.difficulty = params.difficulty;
  if (params.status !== undefined) out.status = params.status;
  if (params.origin !== undefined) out.origin = params.origin;
  if (params.sort !== undefined) out.sort = sortValue(params.sort.key, params.sort.dir);
  if (params.page > 1) out.page = String(params.page);
  return out;
}

export function lessonQueryOf(
  params: LessonListParams,
  folder: ConsoleLessonFolder,
): ConsoleLessonQuery {
  return {
    folder,
    q: params.q,
    category: params.category,
    difficulty: params.difficulty,
    status: params.status,
    origin: params.origin,
    sort: params.sort,
    page: params.page,
    pageSize: LESSONS_PAGE_SIZE,
  };
}
