import { describe, expect, it } from "vitest";
import { filterAssignable } from "../assignable";

const CATEGORIES = ["CYBERSEC", "DEV", "NETWORK"] as const;

/** A catalogue comfortably larger than the cap this used to carry. */
const CATALOGUE = Array.from({ length: 120 }, (_entry, i) => {
  const category = CATEGORIES[i % 3] ?? "CYBERSEC";
  const title = `Leçon ${String(i)}`;
  return { id: `l-${String(i)}`, category, search: `${title} ${category}`.toLowerCase() };
});

const NOTHING_SET = new Set<string>();

describe("the lessons a teacher may assign", () => {
  it("offers every one of them, with no cap", () => {
    const all = filterAssignable(CATALOGUE, {
      alreadySet: NOTHING_SET,
      category: "",
      query: "",
    });

    // The regression this exists for: the list was silently cut to 30 and
    // nothing on screen said so.
    expect(all).toHaveLength(CATALOGUE.length);
    expect(all.at(-1)?.id).toBe("l-119");
  });

  it("narrows by category without hiding the rest of that category", () => {
    const dev = filterAssignable(CATALOGUE, {
      alreadySet: NOTHING_SET,
      category: "DEV",
      query: "",
    });

    expect(dev).toHaveLength(40);
    expect(dev.every((l) => l.category === "DEV")).toBe(true);
  });

  it("searches on title and category together, ignoring case and spacing", () => {
    // A substring, not a word: "leçon 7" is also the start of "leçon 70" and
    // the nine after it, and a teacher typing it should be shown all eleven
    // rather than the one that happens to match exactly.
    const seven = filterAssignable(CATALOGUE, {
      alreadySet: NOTHING_SET,
      category: "",
      query: "  LEÇON 7 ",
    });
    expect(seven.map((l) => l.id)).toEqual([
      "l-7",
      "l-70",
      "l-71",
      "l-72",
      "l-73",
      "l-74",
      "l-75",
      "l-76",
      "l-77",
      "l-78",
      "l-79",
    ]);

    // The category is part of the searchable text, so typing a domain works.
    expect(
      filterAssignable(CATALOGUE, { alreadySet: NOTHING_SET, category: "", query: "network" }),
    ).toHaveLength(40);
  });

  it("combines a category with a search rather than letting one win", () => {
    const both = filterAssignable(CATALOGUE, {
      alreadySet: NOTHING_SET,
      category: "DEV",
      query: "network",
    });
    expect(both).toEqual([]);
  });

  it("leaves out what is already set for the class", () => {
    const set = new Set(["l-0", "l-1", "l-2"]);
    const rest = filterAssignable(CATALOGUE, { alreadySet: set, category: "", query: "" });

    expect(rest).toHaveLength(CATALOGUE.length - 3);
    expect(rest.some((l) => set.has(l.id))).toBe(false);
  });
});
