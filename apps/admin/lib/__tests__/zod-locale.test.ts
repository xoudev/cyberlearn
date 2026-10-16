/**
 * The console's forms show Zod's message when an action does not word one
 * itself. Once the shared locale is set, as the console's instrumentation does,
 * that message is French, for every schema, including the ones built before
 * the setting.
 */

import { configureZodLocale } from "@cyberlearn/types/zod-locale";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { LESSON_LIMITS, LESSON_SLUG, LESSON_SLUG_HINT } from "../lesson-limits";

const description = z.string().max(LESSON_LIMITS.descriptionMax);
const slug = z.string().regex(LESSON_SLUG, LESSON_SLUG_HINT);

describe("configureZodLocale", () => {
  it("turns Zod's default messages French", () => {
    configureZodLocale();
    const issue = description.safeParse("x".repeat(LESSON_LIMITS.descriptionMax + 1)).error
      ?.issues[0];
    expect(issue?.message).toBe(`${String(LESSON_LIMITS.descriptionMax)} caractères au plus.`);
  });

  it("leaves a message the schema words itself alone", () => {
    configureZodLocale();
    expect(slug.safeParse("Mon Slug").error?.issues[0]?.message).toBe(LESSON_SLUG_HINT);
  });
});
