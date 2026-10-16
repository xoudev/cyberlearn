import { z } from "zod";

/**
 * An enum read from a file someone writes by hand: a lesson's frontmatter, a
 * path manifest, a challenge file. The shared locale (zod-locale.ts) words an
 * enum's error for a form, whose options are on screen, and never lists the
 * values; in a file there is nothing on screen, so the message names them.
 */
export function authoredEnum<const T extends readonly [string, ...string[]]>(
  values: T,
): z.ZodEnum<z.core.util.ToEnum<T[number]>> {
  return z.enum(values, { error: `Valeur attendue : ${frenchList(values)}.` });
}

/** "A", "A ou B", "A, B ou C". */
function frenchList(values: readonly [string, ...string[]]): string {
  const head = values.slice(0, -1);
  const last = values[values.length - 1] ?? "";
  return head.length === 0 ? last : `${head.join(", ")} ou ${last}`;
}
