import { z } from "zod";
import type { Category, Difficulty, ProgressStatus } from "@cyberlearn/db";

/**
 * The catalogue's filters, read from its URL and written back into its links.
 *
 * The params were cast straight to the Prisma enums, so `?difficulty=foo`
 * reached the query as a difficulty and failed there. Each one is checked
 * against its enum instead, and a value that is not one is dropped: the page
 * shows what it would without it, and no link on it carries it forward.
 */

/** A page's search params, as Next hands them over. */
export type RawParams = Record<string, string | string[] | undefined>;

const categorySchema = z.enum(["DEV", "CYBERSEC", "NETWORK"]) satisfies z.ZodType<Category>;
const difficultySchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
]) satisfies z.ZodType<Difficulty>;
const statusSchema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]) satisfies z.ZodType<ProgressStatus>;
/** As long as the search box lets anyone type. */
export const CATALOG_SEARCH_MAX = 100;
const searchSchema = z.string().trim().max(CATALOG_SEARCH_MAX);
const pageSchema = z.coerce.number().int().min(1);

export interface CatalogFilters {
  category: Category | undefined;
  difficulty: Difficulty | undefined;
  status: ProgressStatus | undefined;
  /** The search, trimmed; empty for none. */
  q: string;
  page: number;
}

export type CatalogParam = "category" | "difficulty" | "status" | "q" | "page";

function first(params: RawParams, key: CatalogParam): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function valid<T>(schema: z.ZodType<T>, value: string | undefined): T | undefined {
  if (value === undefined) return undefined;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

export function parseCatalogFilters(params: RawParams): CatalogFilters {
  return {
    category: valid(categorySchema, first(params, "category")),
    difficulty: valid(difficultySchema, first(params, "difficulty")),
    status: valid(statusSchema, first(params, "status")),
    q: valid(searchSchema, first(params, "q")) ?? "",
    page: valid(pageSchema, first(params, "page")) ?? 1,
  };
}

/**
 * The catalogue's URL with some filters changed: a string sets one, null
 * clears it. Any change but the page's own goes back to the first page, since
 * the page the reader was on may not exist in the new list.
 */
export function catalogHref(
  filters: CatalogFilters,
  updates: Partial<Record<CatalogParam, string | null>>,
): string {
  const next = new URLSearchParams();
  if (filters.category !== undefined) next.set("category", filters.category);
  if (filters.difficulty !== undefined) next.set("difficulty", filters.difficulty);
  if (filters.status !== undefined) next.set("status", filters.status);
  if (filters.q.length > 0) next.set("q", filters.q);
  if (filters.page > 1) next.set("page", String(filters.page));
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
  }
  const qs = next.toString();
  return `/lessons${qs ? `?${qs}` : ""}`;
}
