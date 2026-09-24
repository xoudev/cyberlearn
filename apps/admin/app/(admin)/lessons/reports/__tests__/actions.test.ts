import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAction = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdminAction }));

const resolveQuiz = vi.fn();
const auditCreate = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  quizReportRepository: { resolveQuiz },
  prisma: { auditLog: { create: auditCreate } },
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

const { resolveQuizReportsAction } = await import("../actions");

const LESSON = "11111111-1111-4111-8111-111111111111";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminAction.mockResolvedValue({ id: "admin-1", email: undefined, role: "ADMIN" });
  resolveQuiz.mockResolvedValue(3);
});

describe("resolveQuizReportsAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      resolveQuizReportsAction(form({ lessonId: LESSON, quizId: "q-1" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(resolveQuiz).not.toHaveBeenCalled();
  });

  it("closes the question's open reports and logs it", async () => {
    await resolveQuizReportsAction(form({ lessonId: LESSON, quizId: "q-1" }));
    expect(resolveQuiz).toHaveBeenCalledWith(LESSON, "q-1");
    const [args] = auditCreate.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({
      actorId: "admin-1",
      action: "quiz.report.resolve",
      targetId: LESSON,
      metadata: { quizId: "q-1", count: 3 },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/lessons/reports");
  });

  it("does nothing with a lesson id that is not one", async () => {
    await resolveQuizReportsAction(form({ lessonId: "x", quizId: "q-1" }));
    expect(resolveQuiz).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
