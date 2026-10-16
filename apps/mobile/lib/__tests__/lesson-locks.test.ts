import { describe, expect, it } from "vitest";
import { lockedLessonLabel, readLessonLocks } from "../lesson-locks";

/**
 * The path lock as the server tells it: the app's catalogue used to list
 * every lesson as open and its lesson screen to open any of them, so a
 * mission the path screen showed locked could be read, answered and finished.
 */

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("readLessonLocks", () => {
  it("reads each locked lesson with the path that opens it", () => {
    const locks = readLessonLocks({
      ok: true,
      locked: { [A]: { slug: "python-bases", title: "Python : les bases" } },
    });
    expect([...locks.entries()]).toEqual([
      [A, { slug: "python-bases", title: "Python : les bases" }],
    ]);
    expect(locks.get(B)).toBeUndefined();
  });

  it("reads nothing out of a refusal or a body it does not know", () => {
    for (const body of [null, "x", {}, { ok: false, error: "Non authentifié." }, { ok: true }]) {
      expect(readLessonLocks(body).size).toBe(0);
    }
    expect(readLessonLocks({ ok: true, locked: null }).size).toBe(0);
  });

  it("leaves out a lock without a path to lead to, and keeps one without a title", () => {
    const locks = readLessonLocks({
      ok: true,
      locked: { [A]: { title: "Sans adresse" }, [B]: { slug: "linux" }, x: "pas un objet" },
    });
    expect([...locks.entries()]).toEqual([[B, { slug: "linux", title: "" }]]);
  });
});

describe("lockedLessonLabel", () => {
  it("says the lesson is locked and where it opens, as the site's catalogue does", () => {
    expect(
      lockedLessonLabel("Les boucles", { slug: "python-bases", title: "Python : les bases" }),
    ).toBe("Les boucles. Leçon verrouillée, à débloquer dans le parcours Python : les bases");
    expect(lockedLessonLabel("Les boucles", { slug: "python-bases", title: "" })).toBe(
      "Les boucles. Leçon verrouillée, à débloquer dans son parcours",
    );
  });
});
