import { LESSON_COMPONENTS } from "@cyberlearn/lib/mdx-components";
import { describe, expect, it } from "vitest";
import { filterGuide, guideSections } from "../components/mdx-guide-sections";

/**
 * The guide panel lists what the registry lists. The registry is held to the
 * pipeline on its own side (packages/lib); this holds the panel to the
 * registry, so a component never again exists for the lesson page and not
 * for the person writing the lesson.
 */

describe("the guide sections", () => {
  const sections = guideSections();

  it("start with Markdown, then list every component of the registry once", () => {
    expect(sections[0]?.id).toBe("markdown");
    expect(sections[0]?.groups[0]?.entries.length).toBeGreaterThan(0);

    const names = sections.slice(1).flatMap((section) => section.groups.map((g) => g.name));
    expect([...names].sort()).toEqual(LESSON_COMPONENTS.map((spec) => spec.name).sort());
  });

  it("give every component its examples and its section of the guide", () => {
    for (const section of sections.slice(1)) {
      expect(section.groups.length, section.id).toBeGreaterThan(0);
      for (const group of section.groups) {
        const spec = LESSON_COMPONENTS.find((candidate) => candidate.name === group.name);
        expect(spec, group.label).toBeDefined();
        expect(group.entries).toEqual(spec?.examples);
        expect(group.docUrl).toMatch(/LESSON_AUTHORING_GUIDE\.md#/);
      }
    }
  });

  it("colour each family differently", () => {
    const accents = sections.map((section) => section.accent);
    expect(new Set(accents).size).toBe(accents.length);
  });
});

describe("filterGuide", () => {
  const sections = guideSections();

  it("returns everything for an empty query", () => {
    expect(filterGuide(sections, "")).toEqual(sections);
    expect(filterGuide(sections, "   ")).toEqual(sections);
  });

  it("keeps a whole component when its name or label matches, accents and case aside", () => {
    const hit = filterGuide(sections, "ENCADRE");
    expect(hit.map((section) => section.id)).toEqual(["callout"]);
    expect(hit[0]?.groups[0]?.entries.map((e) => e.label)).toEqual([
      "info",
      "warning",
      "danger",
      "success",
    ]);
  });

  it("keeps only the matching examples when the component itself does not match", () => {
    const hit = filterGuide(sections, "powershell");
    expect(hit.map((section) => section.id)).toEqual(["terminal"]);
    expect(hit[0]?.groups.map((g) => g.name)).toEqual(["SimulatedTerminal"]);
    expect(hit[0]?.groups[0]?.entries.map((e) => e.label)).toEqual([
      "powershell-basics",
      "powershell-sec",
    ]);
  });

  it("finds Markdown entries too", () => {
    const hit = filterGuide(sections, "tableau");
    expect(hit.map((section) => section.id)).toEqual(["markdown"]);
    expect(hit[0]?.groups[0]?.entries.map((e) => e.label)).toEqual(["Tableau"]);
  });

  it("returns nothing for a query nothing matches", () => {
    expect(filterGuide(sections, "zzzz-nothing")).toEqual([]);
  });
});
