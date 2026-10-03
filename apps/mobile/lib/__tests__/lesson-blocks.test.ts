import { describe, expect, it } from "vitest";
import { parseLesson } from "../lesson-blocks";

describe("parseLesson", () => {
  it("preserves native block order across lesson sections", () => {
    const lesson = parseLesson(`
## Comprendre

Premier paragraphe.

<Callout type="warning">Reste vigilant.</Callout>

\`\`\`ts
const safe = true;
\`\`\`

## Vérifier

- Un
- Deux
`);

    expect(lesson.sections).toHaveLength(2);
    expect(lesson.sections[0]?.title).toBe("Comprendre");
    expect(lesson.sections[0]?.blocks.map((block) => block.kind)).toEqual([
      "paragraph",
      "callout",
      "code",
    ]);
    expect(lesson.sections[1]?.blocks[0]).toEqual({
      kind: "list",
      ordered: false,
      items: ["Un", "Deux"],
    });
  });

  it("extracts quizzes for the native result flow", () => {
    const lesson = parseLesson(`
## Quiz

<Quiz id="q-1" question="Port sécurisé ?" options={["80","443"]} correct={1} />
`);

    expect(lesson.quizzes).toEqual([
      {
        kind: "quiz",
        id: "q-1",
        question: "Port sécurisé ?",
        options: ["80", "443"],
        correct: 1,
        explanation: null,
      },
    ]);
  });

  it("keeps a quiz's explanation, to show once it is answered", () => {
    const lesson = parseLesson(`
## Quiz

<Quiz id="q-1"
  question="Port sécurisé ?"
  options={["80", "443"]}
  correct={1}
  explanation="HTTPS écoute sur le port 443, HTTP sur le \\"80\\"."
/>
`);
    expect(lesson.quizzes[0]?.explanation).toBe('HTTPS écoute sur le port 443, HTTP sur le "80".');
  });

  it("keeps web-only media visible as labelled placeholders", () => {
    const lesson = parseLesson(`
## Observer

<LessonVideo src="/demo.mp4" />
<Diagram />
`);

    expect(lesson.sections[0]?.blocks).toEqual([
      { kind: "placeholder", label: "Vidéo" },
      { kind: "placeholder", label: "Diagramme" },
    ]);
  });

  it("reads a real Linux terminal as the card of what to type", () => {
    const lesson = parseLesson(`
## Pratiquer

<LinuxTerminal title="Tes premiers droits" files={{ "notes.txt": "a" }} expectedCommands={["ls -l", "chmod 600 notes.txt"]} hints={["ls -l montre les droits."]} />
`);

    expect(lesson.sections[0]?.blocks).toEqual([
      {
        kind: "terminal",
        title: "Tes premiers droits",
        commands: ["ls -l", "chmod 600 notes.txt"],
        hints: ["ls -l montre les droits."],
      },
    ]);
  });

  it("keeps the time limit of a timed terminal, such as a practical exam", () => {
    const lesson = parseLesson(`
## L'épreuve

<LinuxTerminal title="L'épreuve pratique" timeLimitMinutes={30} checks={[{ "label": "a", "path": "a", "expect": "file" }]} hints={["Module 4."]} />
`);

    expect(lesson.sections[0]?.blocks).toEqual([
      {
        kind: "terminal",
        title: "L'épreuve pratique",
        commands: [],
        hints: ["Module 4."],
        timeLimitMinutes: 30,
      },
    ]);
  });

  it("shows the code of a playground written as starterCode", () => {
    const lesson = parseLesson(
      [
        "## Essayer",
        "",
        '<CodePlayground language="python" starterCode={`if a > b:',
        '    print("a")',
        "\\tprint(\\`b\\`)`} />",
        "",
        "Suite du texte.",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks).toEqual([
      { kind: "playground", lang: "python", code: 'if a > b:\n    print("a")\n\tprint(`b`)' },
      { kind: "paragraph", text: "Suite du texte." },
    ]);
  });

  it("takes the list's indent off the code, not the code's own", () => {
    const lesson = parseLesson(
      [
        "## Essayer",
        "",
        "- Lance ceci :",
        "",
        '  <CodePlayground language="python" starterCode={`for i in range(3):',
        "      print(i)`} />",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks[1]).toEqual({
      kind: "playground",
      lang: "python",
      code: "for i in range(3):\n    print(i)",
    });
  });

  it("shows a Python challenge: statement, starting code and tests", () => {
    const lesson = parseLesson(
      [
        "## Le défi",
        "",
        '<PythonChallenge id="py-1" title="Somme" description="Renvoie la somme, l\'entier n compris." starterCode="def solution(n):',
        '    pass" tests={[{ input: "solution(5)", expected: "15" }, { input: "solution({0: 1}[0])", expected: "1", label: "Cas \\"limite\\"" }]} />',
        "",
        "Après le défi.",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks).toEqual([
      {
        kind: "challenge",
        title: "Somme",
        description: "Renvoie la somme, l'entier n compris.",
        code: "def solution(n):\n    pass",
        tests: [
          { input: "solution(5)", expected: "15", label: null },
          { input: "solution({0: 1}[0])", expected: "1", label: 'Cas "limite"' },
        ],
      },
      { kind: "paragraph", text: "Après le défi." },
    ]);
  });

  it("still reads a playground written with its code as children", () => {
    const lesson = parseLesson(
      [
        "## Essayer",
        "",
        '<CodePlayground language="javascript" starterCode={`a`} />',
        "",
        '<CodePlayground language="python">',
        "print(1)",
        "</CodePlayground>",
      ].join("\n"),
    );

    expect(lesson.sections[0]?.blocks).toEqual([
      { kind: "playground", lang: "javascript", code: "a" },
      { kind: "playground", lang: "python", code: "print(1)" },
    ]);
  });
});
