/**
 * The slug rule the lesson forms and their actions share. The forms put
 * LESSON_SLUG_PATTERN in a `pattern` attribute, which the browser compiles
 * with the `v` flag and drops without a word when it does not compile; the
 * actions test LESSON_SLUG. Both must accept and refuse the same slugs.
 */

import { describe, expect, it } from "vitest";
import { LESSON_SLUG, LESSON_SLUG_PATTERN } from "../lesson-limits";

/** The pattern as the browser runs a `pattern` attribute. */
const asAttribute = new RegExp(`^(?:${LESSON_SLUG_PATTERN})$`, "v");

describe("LESSON_SLUG_PATTERN", () => {
  it("compiles with the v flag, as a pattern attribute does", () => {
    expect(() => new RegExp(LESSON_SLUG_PATTERN, "v")).not.toThrow();
  });

  it.each(["introduction-au-sujet", "jwt-2", "a1b"])("accepts %s, on both sides", (slug) => {
    expect(asAttribute.test(slug)).toBe(true);
    expect(LESSON_SLUG.test(slug)).toBe(true);
  });

  it.each(["Mon-Slug", "mon slug", "leçon", "mon_slug", "a/b", ""])(
    "refuses %j, on both sides",
    (slug) => {
      expect(asAttribute.test(slug)).toBe(false);
      expect(LESSON_SLUG.test(slug)).toBe(false);
    },
  );
});
