import { describe, expect, it, vi } from "vitest";
import { authoringProblems, checkLessonForSave } from "./authoring.js";
import { describeLessonMdxProblem, MAX_LESSON_MDX_PROBLEMS } from "./check.js";

/**
 * The rules CI applied to content/ alone, applied on save: an author's note
 * left in the lesson, an em dash, a diagram markdown rewrites before mermaid
 * reads it. Each problem at its line and column, like the render check's.
 */

const EM_DASH = "\u2014";
const places = (problems: { line: number; column: number }[]): unknown =>
  problems.map(({ line, column }) => ({ line, column }));

describe("checkLessonForSave", () => {
  it("accepts a lesson that renders and keeps the rules", async () => {
    expect(
      await checkLessonForSave(
        '## Une section\n\nDu texte, avec une virgule.\n\n<Quiz id="q" question="?" options={["a", "b"]} correct={1} />',
      ),
    ).toEqual({ ok: true });
  });

  it("puts a section that does not render before a rule that is broken", async () => {
    const r = await checkLessonForSave(
      `## S\n\nUn mot ${EM_DASH} un autre.\n\n<Quiz correct={True} />`,
    );
    if (r.ok) throw new Error("accepted True");
    expect(r.problems.map((p) => p.kind ?? "render")).toEqual(["render", "authoring"]);
  });
});

describe("authoring markers", () => {
  it("refuses the note an author leaves at the bottom, at its line", async () => {
    const r = await checkLessonForSave("## Fin\n\nLe texte.\n\n  OK 03 écrit\n");
    if (r.ok) throw new Error("accepted a marker");
    expect(r.kind).toBe("authoring");
    expect(r.section).toBe("Fin");
    expect({ line: r.line, column: r.column }).toEqual({ line: 5, column: 3 });
    expect(describeLessonMdxProblem(r)).toBe(
      "La section « Fin », ligne 5, colonne 3 : Une note de rédaction (« OK … écrit ») est restée dans la leçon : le lecteur la verrait comme un paragraphe. Retire la ligne. Rien n'a été enregistré.",
    );
  });

  it("names the introduction for one above the first heading", async () => {
    const [problem] = await authoringProblems("OK 07-csrf-sessions.mdx écrit\n\n## S\n\nok");
    expect(problem?.section).toBe("introduction");
  });

  it("leaves a sentence that merely starts with OK", async () => {
    expect(await authoringProblems("## S\n\nOK, la suite est écrite plus bas.")).toEqual([]);
  });
});

describe("the em dash", () => {
  it("is refused at each place it appears", async () => {
    const problems = await authoringProblems(
      `## S\n\nUn mot ${EM_DASH} et un autre ${EM_DASH} fin.`,
    );
    expect(places(problems)).toEqual([
      { line: 3, column: 8 },
      { line: 3, column: 22 },
    ]);
    expect(problems[0]?.message).toContain("Tiret cadratin");
  });

  it("leaves the en dash, the French mark of a range", async () => {
    expect(await authoringProblems("## S\n\nDe 10–20 caractères.")).toEqual([]);
  });

  it("keeps a lesson full of them to a readable answer, and counts the rest", async () => {
    const r = await checkLessonForSave(`## S\n\n${`a ${EM_DASH} `.repeat(60)}`);
    if (r.ok) throw new Error("accepted em dashes");
    expect(r.problems).toHaveLength(MAX_LESSON_MDX_PROBLEMS);
    expect(r.total).toBe(60);
    expect(describeLessonMdxProblem(r)).toMatch(/Il y a aussi 59 autres problèmes\.$/);
  });

  it("names the sections of thousands of them without freezing the server", async () => {
    // 100 sections, 4 000 dashes, 80 KB: each problem used to split the whole
    // lesson again to find its section, which took over half a minute.
    const lesson = Array.from(
      { length: 100 },
      (_, s) => `## Section ${String(s)}\n\n${`Un mot ${EM_DASH} un autre.\n`.repeat(40)}`,
    ).join("\n");
    const start = performance.now();
    const problems = await authoringProblems(lesson);
    expect(performance.now() - start).toBeLessThan(2_000);
    expect(problems).toHaveLength(4_000);
    expect(problems[0]?.section).toBe("Section 0");
    expect(problems.at(-1)?.section).toBe("Section 99");
    expect(problems.at(-1)?.line).toBe(lesson.split("\n").length - 1);
  });
});

describe("diagrams", () => {
  const diagram = (...lines: string[]): string =>
    `## Le schéma\n\n<Diagram caption="Un schéma">\n${lines.join("\n")}\n</Diagram>\n`;

  it("accepts a diagram that reaches mermaid as written", async () => {
    expect(
      await authoringProblems(
        diagram("flowchart LR", "  A[Client] --> B[Serveur]", "", "  B --> C"),
      ),
    ).toEqual([]);
  });

  it("refuses one markdown rewrites, at the line it rewrites", async () => {
    const [problem, ...rest] = await authoringProblems(
      diagram("flowchart LR", "  A[Client] --> B", "  B[Doc](ref) --> C"),
    );
    expect(rest).toEqual([]);
    expect(problem).toMatchObject({ kind: "authoring", section: "Le schéma", line: 6, column: 3 });
    expect(problem?.message).toContain(
      "le markdown change « B[Doc](ref) --> C » en « BDoc --> C »",
    );
  });

  it("does not read a diagram shown inside fenced code", async () => {
    expect(
      await authoringProblems("## S\n\n```mdx\n<Diagram>\nA[Doc](ref) --> B\n</Diagram>\n```\n"),
    ).toEqual([]);
  });

  it("hands what mermaid would receive to its parser, when there is one", async () => {
    const parseDiagram = vi.fn((): Promise<unknown> => Promise.resolve({}));
    await authoringProblems(diagram("flowchart LR", "  A --> B"), { parseDiagram });
    // What the Diagram component hands mermaid: markdown has taken the
    // indentation of the paragraph's lines, which mermaid does not need.
    expect(parseDiagram).toHaveBeenCalledWith("flowchart LR\nA --> B");
  });

  it("places a diagram mermaid refuses at the line it stopped on", async () => {
    // mermaid.parse rejects with the parser's hash: its line counts in the
    // source it was given.
    const refusal = Object.assign(
      new Error("Parse error on line 2:\n...\nExpecting 'SQE', got 'PS'"),
      {
        hash: { loc: { first_line: 2 } },
      },
    );
    const parseDiagram = (): Promise<unknown> => Promise.reject(refusal);
    const [problem] = await authoringProblems(diagram("flowchart LR", "", "    A[x (y)] --> B"), {
      parseDiagram,
    });
    expect(problem).toMatchObject({ line: 6, column: 5 });
    expect(problem?.message).toContain(
      "Mermaid ne sait pas lire ce schéma (Expecting 'SQE', got 'PS')",
    );
  });

  it("does not ask mermaid about a diagram markdown already broke", async () => {
    const parseDiagram = vi.fn((): Promise<unknown> => Promise.resolve({}));
    await authoringProblems(diagram("flowchart LR", "  A[*b*] --> C"), { parseDiagram });
    expect(parseDiagram).not.toHaveBeenCalled();
  });
});
