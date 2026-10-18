import { describe, expect, it } from "vitest";
import { checkLessonMdx, describeLessonMdxProblem } from "./check.js";
import { escapeProblem } from "./escapes.js";
import { extractLessonQuizzes } from "./quizzes.js";

/**
 * A backslash between braces is JavaScript's to read, and JavaScript drops the
 * ones it has no meaning for. Quiz q-6 of "Processus et programmes" showed
 * "C:WindowsSystem32" that way, on the site, in the app and in the answer key.
 */

const quiz = (option: string): string =>
  `<Quiz id="q" question="Où ?" options={["Ailleurs", ${option}]} correct={1} />`;

describe("escapeProblem, asked before a lesson is saved", () => {
  it("reads the way JavaScript does: the backslash of \\W is gone", () => {
    // What the check guards against, pinned: every reader agrees on this.
    const [read] = extractLessonQuizzes(quiz('"C:\\Windows\\System32"'));
    expect(read?.options[1]).toBe("C:WindowsSystem32");
  });

  it("refuses an unknown escape, quotes where it is and says what to write", () => {
    expect(escapeProblem(quiz('"le vrai se trouve dans C:\\Windows\\System32"'))).toBe(
      "<Quiz>, attribut « options » : dans « C:\\Windows\\System32 », la barre oblique inverse de \\W disparaîtrait, car entre accolades le texte suit les règles de JavaScript. Écris \\\\W pour la garder, ou retire-la.",
    );
  });

  it("accepts the doubled backslash, which shows one", () => {
    const mdx = quiz('"C:\\\\Windows\\\\System32"');
    expect(escapeProblem(mdx)).toBeNull();
    expect(extractLessonQuizzes(mdx)[0]?.options[1]).toBe("C:\\Windows\\System32");
  });

  it("leaves a quoted attribute alone: it has no escapes, its backslash stays", () => {
    expect(
      escapeProblem(
        '<Quiz id="q" question="Depuis C:\\Users ?" options={["a", "b"]} correct={1} />',
      ),
    ).toBeNull();
  });

  it.each([
    ["a line break, a tab, a carriage return", '"a\\nb\\tc\\r\\n"'],
    ["the string's own quote", '"un \\"mot\\""'],
    ["the single quote of a single-quoted string", "'l\\'école'"],
    ["a character by its code", '"\\x41 \\u00e9 \\u{1F600}"'],
    ["a backtick in a template", "`un \\` seul`"],
    ["${ shown in a template", "`echo \\${HOME}`"],
  ])("keeps %s", (_what, option) => {
    expect(escapeProblem(quiz(option))).toBeNull();
  });

  it.each([
    ["a regex class", '"grep \\d+"', "\\d"],
    ["a regex word boundary, which would be a backspace", '"\\bmot\\b"', "\\b"],
    ["an escaped dot", '"a\\.b"', "\\."],
    ["a sed group", '"s/\\(a\\)/b/"', "\\("],
    ["a quote that needed no escape", '"l\\\'école"', "\\'"],
    ["a dollar outside ${ in a template", "`awk '{print \\$1}'`", "\\$"],
    ["a backslash in an object", '{ "path": "C:\\Temp" }', "\\T"],
  ])("refuses %s", (_what, option, escape) => {
    expect(escapeProblem(quiz(option))).toContain(
      `la barre oblique inverse de ${escape} disparaîtrait`,
    );
  });

  it("refuses a backslash at the end of a line, which takes the line break with it", () => {
    const mdx = '<CodeBlock code={`docker run \\\n  -p 80:80 nginx`} language="bash" />';
    expect(escapeProblem(mdx)).toBe(
      "<CodeBlock>, attribut « code » : dans « docker run \\ », la barre oblique inverse en fin de ligne disparaîtrait avec le retour à la ligne, car entre accolades le texte suit les règles de JavaScript. Écris \\\\ pour la garder, ou retire-la.",
    );
  });

  it("cuts a long word around the backslash", () => {
    const long = `${"a".repeat(50)}\\W${"b".repeat(50)}`;
    expect(escapeProblem(quiz(`"${long}"`))).toContain(
      `dans « …${"a".repeat(30)}\\W${"b".repeat(30)}… »`,
    );
  });

  it("finds it on any component, in a nested element", () => {
    const mdx = `<Tabs>\n<Tab label="Windows">\n<SimulatedTerminal commands={{ "cd": "C:\\Users" }} />\n</Tab>\n</Tabs>`;
    expect(escapeProblem(mdx)).toContain("<SimulatedTerminal>, attribut « commands »");
  });

  it("leaves a lesson that does not parse to the render check", () => {
    expect(escapeProblem('<Quiz options={["C:\\W"')).toBeNull();
  });
});

describe("checkLessonMdx", () => {
  it("refuses the lesson, names the section and the backslash's place, and says nothing was saved", async () => {
    const r = await checkLessonMdx(`## Quiz\n\n${quiz('"C:\\Windows"')}`);
    if (r.ok) throw new Error("accepted a lost backslash");
    expect(r.section).toBe("Quiz");
    expect(r.kind).toBe("text");
    // Line 3, and column 55 is the backslash itself, after `"C:`.
    expect(describeLessonMdxProblem(r)).toBe(
      "La section « Quiz », ligne 3, colonne 55 : <Quiz>, attribut « options » : dans « C:\\Windows », la barre oblique inverse de \\W disparaîtrait, car entre accolades le texte suit les règles de JavaScript. Écris \\\\W pour la garder, ou retire-la. Rien n'a été enregistré.",
    );
  });

  it("points at a backslash on a later line of a template, indented as written", async () => {
    // MDX takes some of a continuation line's indentation before the string
    // reaches the tree: the column is the one in the editor all the same.
    const mdx =
      "## Shell\n\n<SimulatedTerminal\n  commands={[{ cmd: `ls`, output: `a\n    C:\\Temp` }]}\n/>";
    const r = await checkLessonMdx(mdx);
    if (r.ok) throw new Error("accepted a lost backslash");
    expect(r.kind).toBe("text");
    expect({ line: r.line, column: r.column }).toEqual({ line: 5, column: 7 });
  });

  it("reports every string that loses one, not only the first", async () => {
    const r = await checkLessonMdx(
      `## Quiz\n\n${quiz('"C:\\Windows"')}\n\n## Encore\n\n<Quiz id="r" question="Où ?" options={["\\d+", "b"]} correct={1} />`,
    );
    if (r.ok) throw new Error("accepted lost backslashes");
    expect(r.problems.map((p) => [p.section, p.line])).toEqual([
      ["Quiz", 3],
      ["Encore", 7],
    ]);
    expect(describeLessonMdxProblem(r)).toMatch(/Il y a aussi un autre problème\.$/);
  });
});
