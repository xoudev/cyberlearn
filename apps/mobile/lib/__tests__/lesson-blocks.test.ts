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
});
