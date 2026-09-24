import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openByQuiz = vi.fn();
const lessonFindMany = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  quizReportRepository: { openByQuiz },
  prisma: { lesson: { findMany: lessonFindMany } },
}));
vi.mock("../actions", () => ({ resolveQuizReportsAction: vi.fn() }));

const { default: QuizReportsPage } = await import("../page");

const LESSON = "11111111-1111-4111-8111-111111111111";
const MDX =
  '<Quiz id="q-1" question="Quelle différence entre norme et certification ?" options={["Aucune", "La norme pose des exigences"]} correct={1} />';

function report(id: string, reason: string, comment: string | null, username: string | null) {
  return { id, reason, comment, createdAt: new Date("2026-09-20T10:00:00Z"), username };
}

beforeEach(() => {
  vi.clearAllMocks();
  lessonFindMany.mockResolvedValue([{ id: LESSON, contentMdx: MDX }]);
});

async function render(): Promise<string> {
  return renderToStaticMarkup(await QuizReportsPage());
}

describe("the reported questions page", () => {
  it("says there is nothing to read when nothing is reported", async () => {
    openByQuiz.mockResolvedValue([]);
    expect(await render()).toContain("Aucune question signalée");
  });

  it("shows the question as learners see it, its answer key, and every report", async () => {
    openByQuiz.mockResolvedValue([
      {
        lessonId: LESSON,
        lessonTitle: "Cadres et normes",
        lessonRefCode: "CL-LSN-124-V01",
        quizId: "q-1",
        reports: [
          report("r1", "AMBIGUOUS", "Deux réponses se défendent.", "camille"),
          report("r2", "AMBIGUOUS", null, null),
          report("r3", "TYPO", null, "sam"),
        ],
      },
    ]);
    const html = await render();
    expect(html).toContain("Cadres et normes");
    expect(html).toContain("CL-LSN-124-V01 · q-1");
    expect(html).toContain("3 signalements");
    expect(html).toContain("Quelle différence entre norme et certification ?");
    expect(html).toMatch(/data-correct="true">La norme pose des exigences/);
    expect(html).toContain("La question ou les réponses sont ambiguës × 2");
    expect(html).toContain("Faute ou erreur dans le texte × 1");
    expect(html).toContain("Deux réponses se défendent.");
    expect(html).toContain("@camille");
    expect(html).toContain("compte supprimé");
    expect(html).toContain('name="quizId" value="q-1"');
    expect(html).toContain(`href="/lessons/${LESSON}/edit"`);
  });

  it("says so when the question is no longer in the lesson", async () => {
    openByQuiz.mockResolvedValue([
      {
        lessonId: LESSON,
        lessonTitle: "Cadres et normes",
        lessonRefCode: "CL-LSN-124-V01",
        quizId: "q-old",
        reports: [report("r1", "OTHER", null, "camille")],
      },
    ]);
    expect(await render()).toContain("Cette question n&#x27;est plus dans la leçon");
  });
});
