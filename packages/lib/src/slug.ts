/**
 * The hyphens at both ends of a slug, removed in one pass over each end.
 *
 * Every slug in the codebase ended with `.replace(/^-+|-+$/g, "")`. The
 * second half of that pattern is quadratic: on a long run of hyphens that
 * does not reach the end of the string, the engine tries the run again from
 * each of its hyphens. The callers collapse runs first and bound the length,
 * so nothing could be made slow today, but that is a property of each call
 * site, and a seventh copy would not have had it. Two loops have no such
 * case to reason about.
 */
export function trimHyphens(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === "-") start++;
  while (end > start && value[end - 1] === "-") end--;
  return value.slice(start, end);
}
