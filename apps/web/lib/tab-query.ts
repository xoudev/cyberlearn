import { z } from "zod";

/**
 * The tab an address asks for in `?tab=`, among a page's own tabs.
 *
 * A value that is absent, or that is not one of the tabs (an address typed by
 * hand, or kept from an older version of the page), opens the page's default
 * tab rather than an empty one. A repeated parameter counts by its first
 * value, as Next hands it over as an array.
 */
export function tabFromQuery<const T extends readonly [string, ...string[]]>(
  value: string | string[] | null | undefined,
  tabs: T,
  fallback: T[number],
): T[number] {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = z.enum(tabs).safeParse(raw);
  return parsed.success ? parsed.data : fallback;
}
