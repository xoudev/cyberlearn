import { describe, expect, it } from "vitest";
import { MAX_LESSON_PATHS, readLessonLinks } from "../lesson-links";

const P1 = "22222222-2222-4222-8222-222222222222";
const P2 = "33333333-3333-4333-8333-333333333333";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("readLessonLinks", () => {
  it("reads each chosen value, in the order chosen, and none when the fields are missing", () => {
    expect(readLessonLinks(form([]))).toEqual({
      ok: true,
      links: { pathIds: [], prerequisiteIds: [] },
    });
    expect(
      readLessonLinks(
        form([
          ["pathIds", P2],
          ["pathIds", P1],
          ["prerequisiteIds", P1],
        ]),
      ),
    ).toEqual({ ok: true, links: { pathIds: [P2, P1], prerequisiteIds: [P1] } });
  });

  it("names the field it refuses", () => {
    expect(readLessonLinks(form([["pathIds", "linux"]]))).toEqual({
      ok: false,
      field: "pathIds",
      error: "Parcours invalide.",
    });
    expect(
      readLessonLinks(
        form([
          ["prerequisiteIds", P1],
          ["prerequisiteIds", P1],
        ]),
      ),
    ).toEqual({ ok: false, field: "prerequisiteIds", error: "Un prérequis figure deux fois." });
  });

  it("caps the paths of one lesson", () => {
    const many = Array.from({ length: MAX_LESSON_PATHS + 1 }, (_, i): [string, string] => [
      "pathIds",
      `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`,
    ]);
    const result = readLessonLinks(form(many));
    expect(result.ok).toBe(false);
  });
});
