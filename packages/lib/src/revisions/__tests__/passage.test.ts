import { describe, expect, it } from "vitest";
import { passageHref, quizAnchor, sectionFromQuery } from "../passage.js";

/**
 * "Revoir ce passage": the link from a review question back to the lesson,
 * on the section the question is in, scrolled to the question.
 */

describe("passageHref", () => {
  it("opens the lesson on the question's section, counted from 1, at the question", () => {
    expect(passageHref("linux-permissions", 2, "q-6")).toBe(
      "/lessons/linux-permissions?section=3#quiz-q-6",
    );
  });

  it("opens the lesson at the question alone when its section is not known", () => {
    expect(passageHref("linux-permissions", null, "q-6")).toBe(
      "/lessons/linux-permissions#quiz-q-6",
    );
  });

  it("names the anchor the quiz carries on the page", () => {
    expect(quizAnchor("q-6")).toBe("quiz-q-6");
  });
});

describe("sectionFromQuery", () => {
  it("reads the section asked for, counted from 1, as a step from 0", () => {
    expect(sectionFromQuery("3", 5)).toBe(2);
    expect(sectionFromQuery(["1", "4"], 5)).toBe(0);
  });

  it("opens on the first section when none, or one the lesson lacks, is asked for", () => {
    for (const raw of [undefined, "", "0", "6", "-1", "2.5", "abc", "1e3"]) {
      expect(sectionFromQuery(raw, 5)).toBe(0);
    }
  });
});
