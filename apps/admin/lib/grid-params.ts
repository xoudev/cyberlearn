import { z } from "zod";
import type { SortDir } from "@cyberlearn/db";
import { parisLocalToDate } from "@cyberlearn/lib/challenges/tournament";

/**
 * Reading a console list's filters out of its URL.
 *
 * The URL is something anybody can type, so every parameter is checked and a
 * value that does not pass is dropped rather than refused: the list shows what
 * it would without it, and no link on the page carries it forward. Nothing
 * here throws, and nothing reaches a query unchecked.
 */

/** A page's search params, as Next hands them over. */
export type RawParams = Record<string, string | string[] | undefined>;

export interface GridSort<K extends string> {
  key: K;
  dir: SortDir;
}

/** A URL's query as a page receives it, for a route handler that reads the same filters. */
export function rawParams(search: URLSearchParams): RawParams {
  const out: RawParams = {};
  for (const key of new Set(search.keys())) {
    const values = search.getAll(key);
    out[key] = values.length === 1 ? values[0] : values;
  }
  return out;
}

/** A parameter given once, or the first of a repeated one. */
export function first(params: RawParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** A value its schema accepts, or undefined. */
export function valid<T>(schema: z.ZodType<T>, value: string | undefined): T | undefined {
  if (value === undefined) return undefined;
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

/** As long as a search box lets anyone type. */
export const SEARCH_MAX = 100;

/** Cut rather than refused, so a long paste still searches. */
export const searchSchema = z.string().transform((s) => s.slice(0, SEARCH_MAX).trim());

export const pageSchema = z.coerce.number().int().min(1).max(100_000);

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** A calendar day as a date field writes it ("2026-10-12"), and a real one: no 30 February. */
export const daySchema = z
  .string()
  .regex(DAY)
  .refine((value) => parisLocalToDate(`${value}T00:00`) !== null, { message: "Date invalide" });

/** The search box's text, trimmed; empty for none. */
export function searchParam(params: RawParams, key = "q"): string {
  return valid(searchSchema, first(params, key)) ?? "";
}

export function pageParam(params: RawParams): number {
  return valid(pageSchema, first(params, "page")) ?? 1;
}

/** A value from a closed list, or undefined. */
export function oneOf<T extends string>(
  params: RawParams,
  key: string,
  values: readonly [T, ...T[]],
): T | undefined {
  return valid(z.enum(values), first(params, key));
}

/**
 * The sort a list's URL asks for: "?sort=xp" up, "?sort=-xp" down. A key the
 * list does not sort by reads as no sort at all.
 */
export function sortParam<K extends string>(
  params: RawParams,
  keys: readonly [K, ...K[]],
): GridSort<K> | undefined {
  const raw = first(params, "sort");
  if (raw === undefined) return undefined;
  const desc = raw.startsWith("-");
  const key = valid(z.enum(keys), desc ? raw.slice(1) : raw);
  return key === undefined ? undefined : { key, dir: desc ? "desc" : "asc" };
}

/** A day of a date field, checked. */
export function dayParam(params: RawParams, key: string): string | undefined {
  return valid(daySchema, first(params, key));
}

/** Midnight in Paris at the start of a day, the instant a "from" filter begins at. */
export function parisDayStart(day: string): Date | undefined {
  return parisLocalToDate(`${day}T00:00`) ?? undefined;
}

/** Midnight in Paris at the end of a day, the instant a "to" filter stops before. */
export function parisDayEnd(day: string): Date | undefined {
  const match = DAY.exec(day);
  if (match === null) return undefined;
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return parisDayStart(next.toISOString().slice(0, 10));
}
