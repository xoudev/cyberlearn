/**
 * The refCode the new-lesson form proposes. It must read both shapes the
 * catalogue uses, as numbers, and never propose a code a lesson already holds:
 * the save would refuse it, and the admin would not know why the suggestion
 * was wrong.
 */

import { describe, expect, it } from "vitest";
import { nextLessonRefCode } from "../next-ref-code";

describe("nextLessonRefCode", () => {
  it("starts the new catalogue's series on an empty database", () => {
    expect(nextLessonRefCode([])).toBe("CL-LSN-01001-V01");
  });

  it("continues the three-digit series while it is the only one", () => {
    expect(nextLessonRefCode(["CL-LSN-001-V01", "CL-LSN-009-V01", "CL-LSN-010-V02"])).toBe(
      "CL-LSN-011-V01",
    );
  });

  it("reads numbers, not text, where 192 sorts after 02090", () => {
    expect(nextLessonRefCode(["CL-LSN-02090-V01", "CL-LSN-192-V01", "CL-LSN-01063-V01"])).toBe(
      "CL-LSN-02091-V01",
    );
  });

  it("follows the five-digit series as soon as there is one", () => {
    // The bug: the code that sorted last was five digits, the old regex
    // missed it, and the form fell back to CL-LSN-001-V01, which exists.
    expect(nextLessonRefCode(["CL-LSN-001-V01", "CL-LSN-01063-V01"])).toBe("CL-LSN-01064-V01");
  });

  it("treats a number as taken whatever its version", () => {
    expect(nextLessonRefCode(["CL-LSN-01001-V03"])).toBe("CL-LSN-01002-V01");
  });

  it("never proposes lesson 000 of a path", () => {
    expect(nextLessonRefCode(["CL-LSN-01999-V01"])).toBe("CL-LSN-02001-V01");
  });

  it("ignores codes that are not catalogue lessons", () => {
    expect(nextLessonRefCode(["CL-CLS-00042-V01", "not-a-code", "CL-LSN-12-V01"])).toBe(
      "CL-LSN-01001-V01",
    );
  });

  it("moves to five digits when the three-digit series is full", () => {
    const full = Array.from(
      { length: 999 },
      (_, i) => `CL-LSN-${String(i + 1).padStart(3, "0")}-V01`,
    );
    expect(nextLessonRefCode(full)).toBe("CL-LSN-01001-V01");
  });

  it("continues the catalogue, not the showcase path, once the showcase is synced", () => {
    // CL-LSN-99001-V01 is the showcase lesson the sync imports as a draft.
    expect(nextLessonRefCode(["CL-LSN-17091-V01", "CL-LSN-99001-V01"])).toBe("CL-LSN-17092-V01");
  });

  it("keeps the three-digit series when the showcase is the only five-digit code", () => {
    expect(nextLessonRefCode(["CL-LSN-041-V01", "CL-LSN-99001-V01"])).toBe("CL-LSN-042-V01");
  });

  it("never proposes a number in the showcase path, even when the catalogue ends below it", () => {
    expect(nextLessonRefCode(["CL-LSN-98999-V01", "CL-LSN-99001-V01"])).toBe("CL-LSN-01001-V01");
  });

  it("never returns a code that exists, at the top of the range either", () => {
    const taken = ["CL-LSN-01001-V01", "CL-LSN-99999-V01"];
    const next = nextLessonRefCode(taken);
    expect(next).toBe("CL-LSN-01002-V01");
    expect(taken).not.toContain(next);
  });
});
