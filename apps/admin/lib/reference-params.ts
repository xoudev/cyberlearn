import type {
  Category,
  ConsoleSolveQuery,
  ConsoleSolveStatus,
  CosmeticReferenceQuery,
  CosmeticType,
  Difficulty,
  PlacementReferenceQuery,
  QuestReferenceQuery,
  QuestType,
  ReferenceQuery,
  SeasonReferenceQuery,
  SeasonStatus,
} from "@cyberlearn/db";
import { oneOf, pageParam, searchParam, type RawParams } from "./grid-params";

/**
 * The filters of the console's read-only reference lists and of a
 * tournament's flags: read from the URL, written back into its links, and
 * turned into the repository's query. Same rules as list-params.ts: a parse
 * never fails, and a search leaves the defaults out.
 */

export const REFERENCE_PAGE_SIZE = 25;

export const COSMETIC_TYPE_VALUES = [
  "TERMINAL_THEME",
  "HEXAGON_STYLE",
  "PROFILE_FRAME",
  "ACCENT_COLOR",
] as const satisfies readonly CosmeticType[];

export const QUEST_TYPE_VALUES = [
  "LESSON_COMPLETED",
  "PERFECT_QUIZ",
  "STREAK_DAYS",
  "FORUM_POST",
  "WEEKLY_BONUS",
] as const satisfies readonly QuestType[];

export const SEASON_STATUS_VALUES = [
  "ACTIVE",
  "CLOSING",
  "CLOSED",
] as const satisfies readonly SeasonStatus[];

export const PLACEMENT_CATEGORY_VALUES = [
  "DEV",
  "CYBERSEC",
  "NETWORK",
] as const satisfies readonly Category[];

export const PLACEMENT_DIFFICULTY_VALUES = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const satisfies readonly Difficulty[];

export const SOLVE_STATUS_VALUES = [
  "valid",
  "disqualified",
] as const satisfies readonly ConsoleSolveStatus[];

/** Every list here: a search, maybe one or two facets, a page. */
export interface ReferenceListParams {
  q: string;
  page: number;
}

/**
 * The parameters a link to the same list carries, defaults left out: the
 * search, the facets that hold a value, the page past the first.
 */
export function referenceSearch(
  params: ReferenceListParams,
  facets: Readonly<Record<string, string | undefined>> = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.q !== "") out.q = params.q;
  for (const [key, value] of Object.entries(facets)) {
    if (value !== undefined && value !== "") out[key] = value;
  }
  if (params.page > 1) out.page = String(params.page);
  return out;
}

function base(raw: RawParams): ReferenceListParams {
  return { q: searchParam(raw), page: pageParam(raw) };
}

// ─── Cosmetics ──────────────────────────────────────────────────────────────

export interface CosmeticListParams extends ReferenceListParams {
  type: CosmeticType | undefined;
}

export function parseCosmeticListParams(raw: RawParams): CosmeticListParams {
  return { ...base(raw), type: oneOf(raw, "type", COSMETIC_TYPE_VALUES) };
}

export function cosmeticQueryOf(params: CosmeticListParams): CosmeticReferenceQuery {
  return { ...params, pageSize: REFERENCE_PAGE_SIZE };
}

// ─── Quests ─────────────────────────────────────────────────────────────────

export interface QuestListParams extends ReferenceListParams {
  type: QuestType | undefined;
}

export function parseQuestListParams(raw: RawParams): QuestListParams {
  return { ...base(raw), type: oneOf(raw, "type", QUEST_TYPE_VALUES) };
}

export function questQueryOf(params: QuestListParams): QuestReferenceQuery {
  return { ...params, pageSize: REFERENCE_PAGE_SIZE };
}

// ─── Seasons ────────────────────────────────────────────────────────────────

/** No search box: a season has nothing to search but its number. */
export interface SeasonListParams {
  status: SeasonStatus | undefined;
  page: number;
}

export function parseSeasonListParams(raw: RawParams): SeasonListParams {
  return { status: oneOf(raw, "status", SEASON_STATUS_VALUES), page: pageParam(raw) };
}

export function seasonListSearch(params: SeasonListParams): Record<string, string> {
  return referenceSearch({ q: "", page: params.page }, { status: params.status });
}

export function seasonQueryOf(params: SeasonListParams): SeasonReferenceQuery {
  return { ...params, pageSize: REFERENCE_PAGE_SIZE };
}

// ─── Forum sections ─────────────────────────────────────────────────────────

export function parseForumCategoryListParams(raw: RawParams): ReferenceListParams {
  return base(raw);
}

export function forumCategoryQueryOf(params: ReferenceListParams): ReferenceQuery {
  return { ...params, pageSize: REFERENCE_PAGE_SIZE };
}

// ─── Placement questions ────────────────────────────────────────────────────

export interface PlacementListParams extends ReferenceListParams {
  category: Category | undefined;
  difficulty: Difficulty | undefined;
}

export function parsePlacementListParams(raw: RawParams): PlacementListParams {
  return {
    ...base(raw),
    category: oneOf(raw, "category", PLACEMENT_CATEGORY_VALUES),
    difficulty: oneOf(raw, "difficulty", PLACEMENT_DIFFICULTY_VALUES),
  };
}

export function placementQueryOf(params: PlacementListParams): PlacementReferenceQuery {
  return { ...params, pageSize: REFERENCE_PAGE_SIZE };
}

// ─── A tournament's flags ───────────────────────────────────────────────────

export interface SolveListParams extends ReferenceListParams {
  status: ConsoleSolveStatus | undefined;
}

export function parseSolveListParams(raw: RawParams): SolveListParams {
  return { ...base(raw), status: oneOf(raw, "status", SOLVE_STATUS_VALUES) };
}

export function solveQueryOf(tournamentId: string, params: SolveListParams): ConsoleSolveQuery {
  return { tournamentId, ...params, pageSize: REFERENCE_PAGE_SIZE };
}
