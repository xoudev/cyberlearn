/**
 * The refCode the new-lesson form proposes. It must read both shapes the
 * catalogue uses, as numbers, and never propose a code a lesson already holds:
 * the save would refuse it, and the admin would not know why the suggestion
 * was wrong.
 */

import { describe, expect, it } from "vitest";
import {
  lessonRefCodeFor,
  nextLessonRefCode,
  pathLessonPrefix,
  suggestLessonRefCode,
} from "../next-ref-code";

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

describe("pathLessonPrefix", () => {
  it("is the path's number less 100", () => {
    expect(pathLessonPrefix("CL-PATH-102-V01")).toBe(2);
    expect(pathLessonPrefix("CL-PATH-101-V03")).toBe(1);
    expect(pathLessonPrefix("CL-PATH-120-V01")).toBe(20);
  });

  it("gives none for the first catalogue, the showcase or another shape", () => {
    expect(pathLessonPrefix("CL-PATH-004-V01")).toBeNull();
    expect(pathLessonPrefix("CL-PATH-100-V01")).toBeNull();
    expect(pathLessonPrefix("CL-PATH-199-V01")).toBeNull();
    expect(pathLessonPrefix("CL-PATH-250-V01")).toBeNull();
    expect(pathLessonPrefix("CL-CPATH-00042-V01")).toBeNull();
  });
});

describe("lessonRefCodeFor", () => {
  it("numbers the lesson by its place in the path", () => {
    // content/paths/linux.json: CL-PATH-102 lists CL-LSN-02001…
    expect(lessonRefCodeFor("CL-PATH-102-V01", 1, [])).toBe("CL-LSN-02001-V01");
    expect(lessonRefCodeFor("CL-PATH-102-V01", 37, [])).toBe("CL-LSN-02037-V01");
  });

  it("takes the next free number of the path when that one is taken, whatever its version", () => {
    expect(lessonRefCodeFor("CL-PATH-102-V01", 5, ["CL-LSN-02005-V02", "CL-LSN-02006-V01"])).toBe(
      "CL-LSN-02007-V01",
    );
  });

  it("is not stopped by another path's codes or by the three-digit series", () => {
    expect(lessonRefCodeFor("CL-PATH-103-V01", 1, ["CL-LSN-02001-V01", "CL-LSN-001-V01"])).toBe(
      "CL-LSN-03001-V01",
    );
  });

  it("leaves the recap numbers to the recaps and wraps back to 001", () => {
    const tail = Array.from(
      { length: 11 },
      (_, i) => `CL-LSN-02${String(890 + i).padStart(3, "0")}-V01`,
    );
    expect(lessonRefCodeFor("CL-PATH-102-V01", 890, tail)).toBe("CL-LSN-02001-V01");
    expect(lessonRefCodeFor("CL-PATH-102-V01", 950, [])).toBe("CL-LSN-02900-V01");
  });

  it("gives up when the path's range is full or the path has no prefix", () => {
    const full = Array.from(
      { length: 900 },
      (_, i) => `CL-LSN-02${String(i + 1).padStart(3, "0")}-V01`,
    );
    expect(lessonRefCodeFor("CL-PATH-102-V01", 1, full)).toBeNull();
    expect(lessonRefCodeFor("CL-PATH-004-V01", 1, [])).toBeNull();
  });
});

describe("suggestLessonRefCode", () => {
  const linux = (position: number): { pathRefCode: string; position: number } => ({
    pathRefCode: "CL-PATH-102-V01",
    position,
  });

  it("proposes the path's code to a lesson numbered outside its paths", () => {
    // Created before it had a path, so nextLessonRefCode gave it 17092.
    expect(suggestLessonRefCode("CL-LSN-17092-V01", [linux(12)], [])).toEqual({
      refCode: "CL-LSN-02012-V01",
      from: linux(12),
    });
  });

  it("names its code after the first path that gives a prefix", () => {
    const old = { pathRefCode: "CL-PATH-004-V01", position: 1 };
    const network = { pathRefCode: "CL-PATH-103-V01", position: 7 };
    expect(suggestLessonRefCode("CL-LSN-17092-V01", [old, network, linux(2)], [])).toEqual({
      refCode: "CL-LSN-03007-V01",
      from: network,
    });
  });

  it("proposes nothing to a lesson already numbered in one of its paths", () => {
    // 02008 sits at position 9, behind the first recap: still in its range.
    expect(suggestLessonRefCode("CL-LSN-02008-V01", [linux(9)], ["CL-LSN-02009-V01"])).toBeNull();
    expect(
      suggestLessonRefCode(
        "CL-LSN-03004-V01",
        [linux(4), { pathRefCode: "CL-PATH-103-V01", position: 4 }],
        [],
      ),
    ).toBeNull();
  });

  it("never touches the first catalogue's codes or a class lesson's", () => {
    expect(suggestLessonRefCode("CL-LSN-042-V01", [linux(3)], [])).toBeNull();
    expect(suggestLessonRefCode("CL-CLS-00042-V01", [linux(3)], [])).toBeNull();
  });

  it("proposes nothing without a path that gives a prefix", () => {
    expect(suggestLessonRefCode("CL-LSN-17092-V01", [], [])).toBeNull();
    expect(
      suggestLessonRefCode(
        "CL-LSN-17092-V01",
        [{ pathRefCode: "CL-PATH-004-V01", position: 2 }],
        [],
      ),
    ).toBeNull();
  });

  it("does not count the lesson's own code as taken, and skips the others", () => {
    expect(
      suggestLessonRefCode(
        "CL-LSN-17092-V01",
        [linux(12)],
        ["CL-LSN-17092-V01", "CL-LSN-02012-V01"],
      )?.refCode,
    ).toBe("CL-LSN-02013-V01");
  });
});
