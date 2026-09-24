import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractLessonQuizzes } from "../../mdx/quizzes.js";
import { isPositionalOption, quizOptionOrder, quizOrderSeed } from "../option-order.js";

const FOUR = ["12", "15", "8", "Une erreur"];

describe("quizOptionOrder", () => {
  it("is a reordering of the options, nothing lost or repeated", () => {
    for (let s = 0; s < 50; s++) {
      expect([...quizOptionOrder(FOUR, `seed-${String(s)}`)].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it("gives the same order for the same seed, on every call", () => {
    const seed = quizOrderSeed("user-1", "lesson-1", "q-1");
    expect(quizOptionOrder(FOUR, seed)).toEqual(quizOptionOrder(FOUR, seed));
  });

  it("gives different learners different orders", () => {
    const orders = new Set(
      Array.from({ length: 40 }, (_, u) =>
        quizOptionOrder(FOUR, quizOrderSeed(`user-${String(u)}`, "lesson-1", "q-1")).join(""),
      ),
    );
    expect(orders.size).toBeGreaterThan(10);
  });

  it("keeps the orders learners already saw", () => {
    // A change to the hash or the generator would reshuffle every quiz for
    // everybody, answered ones included. If that is ever wanted, it is a
    // decision, and these values change with it.
    expect(quizOptionOrder(FOUR, "user-1:lesson-1:q-1")).toEqual([0, 2, 1, 3]);
    expect(quizOptionOrder(["a", "b", "c"], "user-2:lesson-9:q-3")).toEqual([2, 1, 0]);
    expect(quizOptionOrder([], "x")).toEqual([]);
  });

  it("keeps an option that refers to the others where it was written", () => {
    const options = ["for", "while", "do while", "Aucune des trois"];
    for (let s = 0; s < 30; s++) {
      expect(quizOptionOrder(options, `s${String(s)}`)[3]).toBe(3);
    }
  });
});

describe("isPositionalOption", () => {
  it.each([
    "Aucune des trois",
    "Toutes les réponses ci-dessus",
    "Aucune de ces réponses",
    "Tous les précédents",
    "Les réponses ci-dessous sont fausses",
  ])("pins %s", (text) => {
    expect(isPositionalOption(text)).toBe(true);
  });

  it.each([
    "Les deux font exactement la même chose",
    "Il n'y a aucune différence, ce sont deux mots pour la même chose",
    "Elle supprime toutes les images présentes, taguées ou non",
    "Aucune, les deux comparent",
  ])("leaves %s free to move", (text) => {
    expect(isPositionalOption(text)).toBe(false);
  });
});

describe("over the platform's real quizzes", () => {
  const root = path.resolve(__dirname, "../../../../../content/lessons");
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = path.join(d, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".mdx") ? [p] : [];
    });
  const quizzes = walk(root).flatMap((f) =>
    extractLessonQuizzes(readFileSync(f, "utf8")).map((q) => ({ lesson: f, ...q })),
  );

  it("reads them", () => {
    expect(quizzes.length).toBeGreaterThan(500);
  });

  it("no longer shows the right answer second most of the time", () => {
    const written = quizzes.filter((q) => q.correct === 1).length / quizzes.length;
    expect(written).toBeGreaterThan(0.55);

    const shownAt = [0, 0, 0, 0, 0, 0];
    let total = 0;
    for (let u = 0; u < 20; u++) {
      for (const q of quizzes) {
        const order = quizOptionOrder(
          q.options,
          quizOrderSeed(`user-${String(u)}`, q.lesson, q.id),
        );
        const pos = order.indexOf(q.correct);
        shownAt[pos] = (shownAt[pos] ?? 0) + 1;
        total++;
      }
    }
    // Three or four options: a position holds the answer about a quarter to a third of the time.
    for (const n of shownAt.slice(0, 3)) {
      expect(n / total).toBeGreaterThan(0.2);
      expect(n / total).toBeLessThan(0.36);
    }
  }, 30000);
});
