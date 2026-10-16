import { describe, expect, it } from "vitest";
import { NEXT_LOCKED_HINT, nextBarTarget } from "../next-bar-target";

/** The bar under a lesson: the next lesson, the end of a path, or no path at all. */

const PATH = { path: { slug: "python", title: "Python : des bases à la pratique" } };

describe("nextBarTarget", () => {
  it("leads to the next lesson of the path", () => {
    expect(nextBarTarget({ slug: "python-boucles", title: "Les boucles" }, PATH)).toEqual({
      eyebrow: "Prochaine leçon",
      title: "Les boucles",
      href: "/lessons/python-boucles",
      action: "Leçon suivante",
      hint: null,
    });
  });

  it("leads nowhere yet while the next lesson is locked, and says why", () => {
    // It used to lead there anyway, and the reader landed on the path map
    // without a word.
    expect(nextBarTarget({ slug: "python-boucles", title: "Les boucles" }, PATH, true)).toEqual({
      eyebrow: "Prochaine leçon",
      title: "Les boucles",
      href: null,
      action: "Leçon suivante",
      hint: NEXT_LOCKED_HINT,
    });
    expect(NEXT_LOCKED_HINT).toBe("Termine cette leçon pour ouvrir la suivante.");
  });

  it("leads back to the path from the lesson that closes it", () => {
    expect(nextBarTarget(null, PATH)).toEqual({
      eyebrow: "Dernière leçon du parcours",
      title: "Python : des bases à la pratique",
      href: "/paths/python",
      action: "Retour au parcours",
      hint: null,
    });
  });

  it("leads back to the lessons, without a word about a path, from a lesson in none", () => {
    const target = nextBarTarget(null, null);
    expect(target.href).toBe("/lessons");
    expect(target.action).toBe("Retour aux leçons");
    expect(Object.values(target).join(" ").toLowerCase()).not.toContain("parcours");
  });
});
