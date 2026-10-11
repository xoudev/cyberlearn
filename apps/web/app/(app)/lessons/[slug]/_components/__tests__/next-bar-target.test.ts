import { describe, expect, it } from "vitest";
import { nextBarTarget } from "../next-bar-target";

/** The bar under a lesson: the next lesson, the end of a path, or no path at all. */

const PATH = { path: { slug: "python", title: "Python : des bases à la pratique" } };

describe("nextBarTarget", () => {
  it("leads to the next lesson of the path", () => {
    expect(nextBarTarget({ slug: "python-boucles", title: "Les boucles" }, PATH)).toEqual({
      eyebrow: "Prochaine leçon",
      title: "Les boucles",
      href: "/lessons/python-boucles",
      action: "Leçon suivante",
    });
  });

  it("leads back to the path from the lesson that closes it", () => {
    expect(nextBarTarget(null, PATH)).toEqual({
      eyebrow: "Dernière leçon du parcours",
      title: "Python : des bases à la pratique",
      href: "/paths/python",
      action: "Retour au parcours",
    });
  });

  it("leads back to the lessons, without a word about a path, from a lesson in none", () => {
    const target = nextBarTarget(null, null);
    expect(target.href).toBe("/lessons");
    expect(target.action).toBe("Retour aux leçons");
    expect(Object.values(target).join(" ").toLowerCase()).not.toContain("parcours");
  });
});
