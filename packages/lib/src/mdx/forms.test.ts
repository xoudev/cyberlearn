import { describe, expect, it } from "vitest";
import { parseLessonBlocks, type ComponentBlock } from "./blocks.js";
import { LESSON_COMPONENTS } from "./components.js";
import {
  COMPONENT_FORMS,
  componentForm,
  INNER,
  uniqueId,
  validateComponent,
  type ComponentForm,
} from "./forms.js";
import { LESSON_COMPONENT_NAMES } from "./names.js";

/**
 * A form describes a component the pipeline draws, with fields that do not
 * collide, and accepts every example the guide offers for it: an example the
 * form would flag is either a wrong example or a wrong bound, and either way
 * somebody has to look. Then the bounds themselves.
 */

function form(name: string): ComponentForm {
  const found = componentForm(name);
  if (!found) throw new Error(`no form for ${name}`);
  return found;
}

/** The component block an example is, or null for one written inline in a sentence. */
function block(mdx: string): ComponentBlock | null {
  const parsed = parseLessonBlocks(mdx);
  if (!parsed.ok) throw new Error(parsed.error);
  const [first] = parsed.blocks;
  return first?.kind === "component" ? first : null;
}

/** The names of the component blocks between a block's tags. */
function innerNames(inner: string | null): string[] {
  if (inner === null) return [];
  const parsed = parseLessonBlocks(inner);
  return parsed.ok ? parsed.blocks.flatMap((b) => (b.kind === "component" ? [b.name] : [])) : [];
}

describe("the component forms", () => {
  it("describe components the pipeline draws, with distinct field keys", () => {
    for (const [name, spec] of COMPONENT_FORMS) {
      expect(LESSON_COMPONENT_NAMES).toContain(name);
      expect(spec.name).toBe(name);
      const keys = spec.fields.map((field) => field.key);
      expect(new Set(keys).size, name).toBe(keys.length);
      // One children field at most: a component has one pair of tags.
      const children = spec.fields.filter((f) => f.kind === "children" || f.kind === "blocks");
      expect(children.length, name).toBeLessThanOrEqual(1);
      for (const field of children) expect(field.key).toBe(INNER);
    }
  });

  it("cover the eleven base components", () => {
    expect([...COMPONENT_FORMS.keys()].sort()).toEqual(
      [
        "Callout",
        "Quiz",
        "QuizGroup",
        "CodePlayground",
        "PythonChallenge",
        "SimulatedTerminal",
        "LinuxTerminal",
        "LessonVideo",
        "LessonImage",
        "ExternalLink",
        "Diagram",
      ].sort(),
    );
  });

  it.each(
    LESSON_COMPONENTS.filter((spec) => COMPONENT_FORMS.has(spec.name)).flatMap((spec) =>
      spec.examples.map((example) => [`${spec.name} · ${example.label}`, example.snippet]),
    ),
  )("accept the guide's example %s", (_label, snippet) => {
    const example = block(snippet);
    // An example written inline (the ExternalLink in a sentence) is prose to
    // the block editor, with nothing to validate.
    if (example === null) return;
    const { name, attrs, inner } = example;
    expect(validateComponent(form(name), attrs, inner, innerNames(inner))).toEqual({});
  });
});

describe("validateComponent", () => {
  it("asks for what is required, and only that", () => {
    expect(validateComponent(form("Quiz"), {}, null)).toEqual({
      id: "Obligatoire.",
      question: "Obligatoire.",
      options: "Obligatoire.",
    });
    expect(validateComponent(form("Callout"), { type: "info" }, null)).toEqual({
      [INNER]: "Obligatoire.",
    });
    expect(validateComponent(form("Callout"), { type: "info" }, "Un texte.")).toEqual({});
  });

  it("holds identifiers and addresses to their shape", () => {
    expect(
      validateComponent(
        form("Quiz"),
        { id: "q 1", question: "?", options: ["a", "b"], correct: 0 },
        null,
      ),
    ).toEqual({
      id: "Lettres, chiffres, tirets et tirets bas, sans espace.",
    });
    expect(validateComponent(form("ExternalLink"), { href: "nmap.org" }, "Nmap")).toEqual({
      href: "Une adresse complète, en http ou https.",
    });
  });

  it("wants a quiz with at least two options and the right one checked", () => {
    const quiz = form("Quiz");
    const base = { id: "q-1", question: "?" };
    expect(validateComponent(quiz, { ...base, options: ["a"], correct: 0 }, null)).toEqual({
      options: "Au moins 2 options.",
    });
    expect(validateComponent(quiz, { ...base, options: ["a", ""], correct: 0 }, null)).toEqual({
      options: "Une option est vide.",
    });
    expect(validateComponent(quiz, { ...base, options: ["a", "b"], correct: 2 }, null)).toEqual({
      options: "Coche la bonne option.",
    });
    expect(validateComponent(quiz, { ...base, options: ["a", "b"] }, null)).toEqual({
      options: "Coche la bonne option.",
    });
  });

  it("keeps numbers within the page's bounds", () => {
    const terminal = form("LinuxTerminal");
    expect(validateComponent(terminal, { height: 100 }, null)).toEqual({ height: "Au moins 200." });
    expect(validateComponent(terminal, { timeLimitMinutes: 181 }, null)).toEqual({
      timeLimitMinutes: "Au plus 180.",
    });
    expect(validateComponent(terminal, { height: 300.5 }, null)).toEqual({
      height: "Un nombre entier.",
    });
    expect(validateComponent(terminal, { height: 300 }, null)).toEqual({});
  });

  it("reads rows column by column, naming the line", () => {
    const challenge = form("PythonChallenge");
    const base = { id: "py-1" };
    expect(validateComponent(challenge, { ...base, tests: [] }, null)).toEqual({
      tests: "Obligatoire.",
    });
    expect(
      validateComponent(challenge, { ...base, tests: [{ input: "solution(1)" }] }, null),
    ).toEqual({ tests: "Ligne 1 : Résultat attendu manque." });
    const terminal = form("LinuxTerminal");
    expect(
      validateComponent(terminal, { checks: [{ label: "x", path: "a", expect: "maybe" }] }, null),
    ).toEqual({ checks: "Ligne 1 : Attendu n'est pas une des valeurs proposées." });
    expect(
      validateComponent(
        terminal,
        { checks: [{ label: "x", path: "a", expect: "file", links: "deux" }] },
        null,
      ),
    ).toEqual({ checks: "Ligne 1 : Liens physiques doit être un nombre." });
  });

  it("accepts only the allowed components between a group's tags", () => {
    const group = form("QuizGroup");
    expect(validateComponent(group, {}, null)).toEqual({ [INNER]: "Obligatoire." });
    expect(validateComponent(group, {}, "<Callout />", ["Callout"])).toEqual({
      [INNER]: "Seulement Quiz ici, pas Callout.",
    });
    expect(validateComponent(group, {}, "<Quiz />", ["Quiz"])).toEqual({});
  });

  it("refuses a value of the wrong kind", () => {
    expect(
      validateComponent(form("CodePlayground"), { language: "python", validate: "oui" }, null),
    ).toEqual({ validate: "Oui ou non." });
    expect(validateComponent(form("CodePlayground"), { language: "rust" }, null)).toEqual({
      language: "Une des valeurs proposées.",
    });
    expect(validateComponent(form("SimulatedTerminal"), { hints: ["a", " "] }, null)).toEqual({
      hints: "Une ligne est vide.",
    });
    expect(validateComponent(form("LinuxTerminal"), { files: { "": "x" } }, null)).toEqual({
      files: "Chaque ligne a une clé et un texte.",
    });
  });
});

describe("uniqueId", () => {
  it("keeps a free identifier and bumps a taken one past every neighbour", () => {
    expect(uniqueId("q-1", new Set())).toBe("q-1");
    expect(uniqueId("q-1", new Set(["q-1"]))).toBe("q-2");
    expect(uniqueId("q-1", new Set(["q-1", "q-2", "q-3"]))).toBe("q-4");
    expect(uniqueId("quiz", new Set(["quiz"]))).toBe("quiz-2");
    expect(uniqueId("anim-tcp", new Set(["anim-tcp", "anim-tcp-2"]))).toBe("anim-tcp-3");
  });
});
