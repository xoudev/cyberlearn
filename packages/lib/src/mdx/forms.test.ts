import { describe, expect, it } from "vitest";
import { parseLessonBlocks, type ComponentBlock } from "./blocks.js";
import { LESSON_COMPONENTS } from "./components.js";
import {
  COMPONENT_FORMS,
  componentForm,
  FORM,
  INNER,
  problemField,
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

  it("cover every component the pipeline draws", () => {
    expect([...COMPONENT_FORMS.keys()].sort()).toEqual([...LESSON_COMPONENT_NAMES].sort());
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

describe("the components' own parsers, behind the forms", () => {
  it("refuse what the page refuses, under the field at fault", () => {
    const flaw = form("FindTheFlaw");
    const good = {
      id: "f-1",
      code: "a\nb",
      line: 2,
      options: ["x", "y"],
      correct: 0,
      explanation: "Parce que.",
    };
    expect(validateComponent(flaw, good, null)).toEqual({});
    // The form's own bound first: a line below 1.
    expect(validateComponent(flaw, { ...good, line: 0 }, null)).toEqual({ line: "Au moins 1." });
    // Then the parser's: a line past the code.
    expect(Object.keys(validateComponent(flaw, { ...good, line: 5 }, null))).toEqual([
      expect.stringMatching(/line|form/),
    ]);
  });

  it("report a problem about the block as a whole under FORM", () => {
    const packet = form("PacketDissector");
    const errors = validateComponent(
      packet,
      { id: "p-1", frame: { eth: { src: "08:00:27:4e:66:a1", dst: "00:0c:29:1a:2b:3c" } } },
      null,
    );
    expect(Object.keys(errors)).toEqual([FORM]);
    expect(errors[FORM]).toContain("arp ou ip");
  });

  it("file a nested path under its first segment, keeping the rest", () => {
    const firewall = form("FirewallLab");
    expect(problemField(firewall, "probes.0.port : un paquet icmp n'a pas de port.")).toEqual([
      "probes",
      "0.port : un paquet icmp n'a pas de port.",
    ]);
    expect(problemField(firewall, "id : Too small")).toEqual(["id", "Too small"]);
    expect(problemField(firewall, "quelque chose de global")).toEqual([
      FORM,
      "quelque chose de global",
    ]);
  });
});

describe("the field kinds of the exercises", () => {
  it("read a group field by field, naming the sub-field", () => {
    const osint = form("PhotoOsint");
    const base = { id: "o-1", src: "/osint/x.jpg", alt: "a", task: "t", place: "p" };
    expect(validateComponent(osint, base, null)).toEqual({ answer: "Obligatoire." });
    expect(
      validateComponent(osint, { ...base, answer: { latitude: 95, longitude: 4 } }, null),
    ).toEqual({ answer: "Latitude : Au plus 90." });
    expect(
      validateComponent(osint, { ...base, answer: { latitude: 45.7, longitude: 4.8 } }, null),
    ).toEqual({});
  });

  it("hold a multiselect to its options", () => {
    const crypto = form("CryptoWorkshop");
    expect(validateComponent(crypto, { id: "c-1", tools: ["xor", "rot13"] }, null)).toEqual({
      tools: "« rot13 » n'est pas un des choix.",
    });
    expect(validateComponent(crypto, { id: "c-1", tools: ["xor", "hex"] }, null)).toEqual({});
  });

  it("hold the JwtLab steps to the lab's, and ask for an attack before the corrected services", () => {
    const jwt = form("JwtLab");
    expect(validateComponent(jwt, { id: "j-1", levels: ["none", "rsa"] }, null)).toEqual({
      levels: "« rsa » n'est pas un des choix.",
    });
    expect(
      validateComponent(jwt, { id: "j-1", levels: ["decode", "none", "fixed"] }, null),
    ).toEqual({});
    expect(validateComponent(jwt, { id: "j-1" }, null)).toEqual({});
    expect(validateComponent(jwt, { id: "j-1", levels: ["decode", "fixed"] }, null)).toEqual({
      [FORM]:
        "levels demande « fixed » sans attaque à rejouer : ajoute « none », « weak-secret » ou « confusion ».",
    });
  });

  it("let a JSON field through to the parser", () => {
    const sql = form("SqlPlayground");
    const base = { id: "s-1", schema: "CREATE TABLE t (a INT);" };
    expect(validateComponent(sql, { ...base, expected: { rows: [[1]] } }, null)).toEqual({});
    const errors = validateComponent(sql, { ...base, expected: { rows: "x" } }, null);
    expect(Object.keys(errors)).toEqual(["expected"]);
  });

  it("take one answer or several in a texts column, and a boolean column", () => {
    const hex = form("HexEditor");
    const base = { id: "h-1", task: "t", bytes: "89 50" };
    expect(
      validateComponent(
        hex,
        { ...base, questions: [{ label: "?", answer: ["1x1", "1 x 1"] }] },
        null,
      ),
    ).toEqual({});
    expect(
      validateComponent(hex, { ...base, questions: [{ label: "?", answer: 3 }] }, null),
    ).toEqual({ questions: "Ligne 1 : Réponse doit être du texte, ou plusieurs séparés par |." });
    const lab = form("SqlInjectionLab");
    expect(
      validateComponent(
        lab,
        {
          id: "l-1",
          schema: "x",
          query: "SELECT 1 WHERE a = '{login}'",
          goal: "g",
          fields: [{ name: "login", label: "Identifiant", secret: "oui" }],
        },
        null,
      ),
    ).toEqual({ fields: "Ligne 1 : Masqué vaut oui ou non." });
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

describe("the IncidentStory form", () => {
  it("hands the scenes to the story's parser, whose verdict is the block's", () => {
    const story = form("IncidentStory");
    const scenes = [
      {
        id: "a",
        text: "x",
        choices: [
          { text: "Un", next: "fin", verdict: "good", consequence: "c" },
          { text: "Deux", next: "fin", verdict: "bad", consequence: "c" },
        ],
      },
      { id: "fin", text: "y", ending: "success" },
    ];
    expect(validateComponent(story, { id: "s-1", scenes }, null)).toEqual({});
    const orphan = [...scenes, { id: "seule", text: "z", ending: "partial" }];
    expect(validateComponent(story, { id: "s-1", scenes: orphan }, null)).toEqual({
      [FORM]: "la scène « seule » n'est atteinte par aucun choix.",
    });
    expect(Object.keys(validateComponent(story, { id: "s-1" }, null))).toEqual(["scenes"]);
  });
});
