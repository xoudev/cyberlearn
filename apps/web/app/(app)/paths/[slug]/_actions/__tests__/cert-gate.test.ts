import { beforeEach, describe, expect, it, vi } from "vitest";

// Spy on the issuance module - we assert WHETHER it's called, not its internals.
// vi.hoisted: the vi.mock factories are hoisted above these declarations.
const m = vi.hoisted(() => ({
  issueCertificate: vi.fn(() => Promise.resolve({ issued: true })),
  findPublishedPathsForLesson: vi.fn(),
  areLessonsComplete: vi.fn(),
  findActiveQuizByPathId: vi.fn(),
}));
const {
  issueCertificate,
  findPublishedPathsForLesson,
  areLessonsComplete,
  findActiveQuizByPathId,
} = m;

vi.mock("@/lib/certificates/issue", () => ({ issueCertificate: m.issueCertificate }));
vi.mock("@cyberlearn/db", () => ({
  pathRepository: {
    findPublishedPathsForLesson: m.findPublishedPathsForLesson,
    areLessonsComplete: m.areLessonsComplete,
  },
  quizRepository: { findActiveQuizByPathId: m.findActiveQuizByPathId },
}));

import { checkAndIssueCertificates } from "@/lib/certificates/check-and-issue";

const PATH = { id: "path-1", slug: "p1", title: "P1" };

beforeEach(() => {
  vi.clearAllMocks();
  findPublishedPathsForLesson.mockResolvedValue([PATH]);
});

describe("checkAndIssueCertificates - quiz gate", () => {
  it("path WITHOUT quiz + lessons complete → issues the certificate", async () => {
    areLessonsComplete.mockResolvedValue(true);
    findActiveQuizByPathId.mockResolvedValue(null);

    await checkAndIssueCertificates("user-1", "lesson-1");

    expect(issueCertificate).toHaveBeenCalledTimes(1);
    expect(issueCertificate).toHaveBeenCalledWith("user-1", "path-1");
  });

  it("path WITH an active quiz → does NOT issue (gated on a passing attempt)", async () => {
    areLessonsComplete.mockResolvedValue(true);
    findActiveQuizByPathId.mockResolvedValue({
      id: "quiz-1",
      passThreshold: 70,
      questionsToDraw: 5,
    });

    await checkAndIssueCertificates("user-1", "lesson-1");

    expect(issueCertificate).not.toHaveBeenCalled();
  });

  it("lessons NOT complete → does NOT issue (and never checks the quiz)", async () => {
    areLessonsComplete.mockResolvedValue(false);

    await checkAndIssueCertificates("user-1", "lesson-1");

    expect(issueCertificate).not.toHaveBeenCalled();
  });

  it("only quiz-less, completed paths emit when a lesson belongs to several paths", async () => {
    findPublishedPathsForLesson.mockResolvedValue([
      { id: "no-quiz", slug: "a", title: "A" },
      { id: "with-quiz", slug: "b", title: "B" },
    ]);
    areLessonsComplete.mockResolvedValue(true);
    findActiveQuizByPathId.mockImplementation((pathId: string) =>
      Promise.resolve(
        pathId === "with-quiz" ? { id: "q", passThreshold: 70, questionsToDraw: 5 } : null,
      ),
    );

    await checkAndIssueCertificates("user-1", "lesson-1");

    expect(issueCertificate).toHaveBeenCalledTimes(1);
    expect(issueCertificate).toHaveBeenCalledWith("user-1", "no-quiz");
  });
});
