import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkLessonMdx, LESSON_COMPONENT_NAMES } from "./check.js";
import {
  guideAnchor,
  guideUrl,
  LESSON_COMPONENT_FAMILIES,
  LESSON_COMPONENTS,
  lessonComponent,
} from "./components.js";

/**
 * The registry describes every component the pipeline accepts, and nothing
 * else; every example it offers renders; every guide section it points at
 * exists. Each of the three is a way the editor's guide used to be wrong:
 * components missing, a snippet the check refused once inserted, a reference
 * to a section that had been renamed.
 */

const GUIDE = path.resolve(__dirname, "../../../../docs/LESSON_AUTHORING_GUIDE.md");

describe("the component registry", () => {
  it("has one entry per name the pipeline accepts, and no other", () => {
    const names = LESSON_COMPONENTS.map((spec) => spec.name);
    expect([...names].sort()).toEqual([...LESSON_COMPONENT_NAMES].sort());
    expect(new Set(names).size).toBe(names.length);
  });

  it("files every component under a family that exists", () => {
    const families = new Set<string>(LESSON_COMPONENT_FAMILIES.map((family) => family.id));
    for (const spec of LESSON_COMPONENTS) expect(families.has(spec.family), spec.name).toBe(true);
    // No empty family: a section with nothing under it is a heading for nothing.
    for (const family of LESSON_COMPONENT_FAMILIES) {
      expect(
        LESSON_COMPONENTS.some((spec) => spec.family === family.id),
        family.id,
      ).toBe(true);
    }
  });

  it("gives every component at least one example, with distinct labels", () => {
    for (const spec of LESSON_COMPONENTS) {
      expect(spec.examples.length, spec.name).toBeGreaterThan(0);
      const labels = spec.examples.map((example) => example.label);
      expect(new Set(labels).size, spec.name).toBe(labels.length);
    }
  });

  it.each(
    LESSON_COMPONENTS.flatMap((spec) =>
      spec.examples.map((example) => [`${spec.name} · ${example.label}`, example.snippet]),
    ),
  )("%s renders", async (_name, snippet) => {
    // Inserted as is, so checked as is: the same check the editors run on save.
    expect(snippet.endsWith("\n")).toBe(true);
    expect(await checkLessonMdx(snippet)).toEqual({ ok: true });
  });

  it("uses the component it describes in each of its examples", () => {
    for (const spec of LESSON_COMPONENTS) {
      for (const example of spec.examples) {
        expect(example.snippet, `${spec.name} · ${example.label}`).toContain(`<${spec.name}`);
      }
    }
  });

  it("points at a section of the authoring guide that exists", () => {
    const guide = readFileSync(GUIDE, "utf8");
    for (const spec of LESSON_COMPONENTS) {
      expect(guide, spec.name).toContain(`\n### ${spec.guide}\n`);
    }
  });

  it("is looked up by name", () => {
    expect(lessonComponent("Quiz")?.label).toBe("QCM");
    expect(lessonComponent("Unknown")).toBeUndefined();
  });
});

describe("guideAnchor", () => {
  it("builds the fragment GitHub gives a heading", () => {
    expect(guideAnchor("5.1 Callout")).toBe("51-callout");
    expect(guideAnchor("5.9b FindTheFlaw - Trouve la faille")).toBe(
      "59b-findtheflaw---trouve-la-faille",
    );
    expect(guideAnchor("5.9m PutInOrder - Remettre dans l'ordre")).toBe(
      "59m-putinorder---remettre-dans-lordre",
    );
    expect(guideAnchor("5.9k SubnetDrill - Calcul de sous-réseaux")).toBe(
      "59k-subnetdrill---calcul-de-sous-réseaux",
    );
    expect(guideUrl({ guide: "5.2 Quiz (QCM)" })).toMatch(
      /LESSON_AUTHORING_GUIDE\.md#52-quiz-qcm$/,
    );
  });
});
