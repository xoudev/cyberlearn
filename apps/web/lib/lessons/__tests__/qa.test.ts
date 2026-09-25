import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  checkQaSubmission: vi.fn<(userId: string) => Promise<{ success: boolean }>>(),
  findLesson: vi.fn<(args: unknown) => Promise<{ slug: string } | null>>(),
  findQuestion: vi.fn<(args: unknown) => Promise<{ lesson: { slug: string } } | null>>(),
  screen:
    vi.fn<
      (input: unknown) => Promise<{ flagged: boolean; throttled: boolean; eventId: string | null }>
    >(),
  attachContent: vi.fn<(eventId: string, id: string) => Promise<void>>(),
  createQuestion: vi.fn<(data: unknown) => Promise<{ id: string }>>(),
  createAnswer: vi.fn<(data: unknown) => Promise<{ id: string }>>(),
  findAnswerWithQuestion:
    vi.fn<
      (
        id: string,
      ) => Promise<{ id: string; questionId: string; question: { userId: string } } | null>
    >(),
  acceptAnswer: vi.fn<(answerId: string, questionId: string) => Promise<void>>(),
  castUpvote: vi.fn<(answerId: string, userId: string) => Promise<string>>(),
  announceModeration: vi.fn<(input: unknown) => Promise<void>>(),
  recordQuestProgress: vi.fn<(...args: unknown[]) => Promise<void>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@cyberlearn/db", () => ({
  MODERATION_SURFACE: { lessonQuestion: "lesson.question", lessonAnswer: "lesson.answer" },
  lessonsVisibleTo: (userId: string) => ({ visibleTo: userId }),
  prisma: {
    lesson: { findFirst: m.findLesson },
    lessonQuestion: { findFirst: m.findQuestion },
  },
  moderationRepository: { screen: m.screen, attachContent: m.attachContent },
  qaRepository: {
    createQuestion: m.createQuestion,
    createAnswer: m.createAnswer,
    findAnswerWithQuestion: m.findAnswerWithQuestion,
    acceptAnswer: m.acceptAnswer,
    castUpvote: m.castUpvote,
  },
}));
vi.mock("@cyberlearn/lib", () => ({
  FLAG_BUDGET_MESSAGE: "Trop de messages signalés.",
  excerpt: (text: string) => text,
}));
vi.mock("@/lib/rate-limit", () => ({ checkQaSubmission: m.checkQaSubmission }));
vi.mock("@/lib/moderation/announce", () => ({ announceModeration: m.announceModeration }));
vi.mock("@/lib/quests/progress", () => ({ recordQuestProgress: m.recordQuestProgress }));

const { acceptLessonAnswer, postLessonAnswer, postLessonQuestion, upvoteLessonAnswer } =
  await import("../qa");

const LESSON_ID = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";
const QUESTION_ID = "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d";
const ANSWER_ID = "2d1c0b9a-8e7f-4c6b-9d4e-3f2a1b0c9d8e";
const CLEAN = { flagged: false, throttled: false, eventId: null };

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.checkQaSubmission.mockResolvedValue({ success: true });
  m.screen.mockResolvedValue(CLEAN);
  m.findLesson.mockResolvedValue({ slug: "tcp" });
  m.findQuestion.mockResolvedValue({ lesson: { slug: "tcp" } });
  m.createQuestion.mockResolvedValue({ id: QUESTION_ID });
  m.createAnswer.mockResolvedValue({ id: ANSWER_ID });
});

describe("postLessonQuestion", () => {
  const input = {
    lessonId: LESSON_ID,
    title: "Pourquoi trois échanges ?",
    content: "Je ne comprends pas pourquoi la poignée de main TCP a trois étapes.",
  };

  it("asks on a lesson the reader can see, screened title and body together", async () => {
    expect(await postLessonQuestion("user-1", input)).toEqual({ ok: true });
    expect(m.findLesson).toHaveBeenCalledWith({
      where: { id: LESSON_ID, visibleTo: "user-1" },
      select: { slug: true },
    });
    expect(m.screen).toHaveBeenCalledWith(
      expect.objectContaining({ text: `${input.title}\n\n${input.content}`, userId: "user-1" }),
    );
    expect(m.revalidatePath).toHaveBeenCalledWith("/lessons/tcp");
  });

  it("refuses a lesson the reader cannot see, before screening", async () => {
    m.findLesson.mockResolvedValue(null);
    expect(await postLessonQuestion("user-1", input)).toEqual({
      ok: false,
      error: "Leçon introuvable.",
    });
    expect(m.screen).not.toHaveBeenCalled();
    expect(m.createQuestion).not.toHaveBeenCalled();
  });

  it("explains a short title in French", async () => {
    expect(await postLessonQuestion("user-1", { ...input, title: "Pourquoi" })).toEqual({
      ok: false,
      error: "Un titre de 10 caractères au minimum.",
    });
  });

  it("refuses over the rate limit, and over the flag budget writes nothing", async () => {
    m.checkQaSubmission.mockResolvedValue({ success: false });
    expect((await postLessonQuestion("user-1", input)).ok).toBe(false);
    m.checkQaSubmission.mockResolvedValue({ success: true });
    m.screen.mockResolvedValue({ flagged: true, throttled: true, eventId: "e" });
    expect(await postLessonQuestion("user-1", input)).toEqual({
      ok: false,
      error: "Trop de messages signalés.",
    });
    expect(m.createQuestion).not.toHaveBeenCalled();
  });

  it("holds a flagged question and tells its author", async () => {
    m.screen.mockResolvedValue({ flagged: true, throttled: false, eventId: "event-1" });
    expect(await postLessonQuestion("user-1", input)).toEqual({ ok: true, heldForReview: true });
    expect(m.createQuestion).toHaveBeenCalledWith(expect.objectContaining({ isHidden: true }));
    expect(m.attachContent).toHaveBeenCalledWith("event-1", QUESTION_ID);
    expect(m.announceModeration).toHaveBeenCalled();
  });
});

describe("postLessonAnswer", () => {
  const input = { questionId: QUESTION_ID, content: "Pour que chaque côté confirme l'autre." };

  it("answers a question still up on a visible lesson, and credits the quest", async () => {
    expect(await postLessonAnswer("user-1", input)).toEqual({ ok: true });
    expect(m.findQuestion).toHaveBeenCalledWith({
      where: { id: QUESTION_ID, isHidden: false, lesson: { visibleTo: "user-1" } },
      select: { lesson: { select: { slug: true } } },
    });
    expect(m.recordQuestProgress).toHaveBeenCalled();
  });

  it("refuses a question taken down or out of sight", async () => {
    m.findQuestion.mockResolvedValue(null);
    expect(await postLessonAnswer("user-1", input)).toEqual({
      ok: false,
      error: "Question introuvable.",
    });
    expect(m.createAnswer).not.toHaveBeenCalled();
  });

  it("holds a flagged answer without crediting the quest", async () => {
    m.screen.mockResolvedValue({ flagged: true, throttled: false, eventId: "event-2" });
    expect(await postLessonAnswer("user-1", input)).toEqual({ ok: true, heldForReview: true });
    expect(m.recordQuestProgress).not.toHaveBeenCalled();
  });
});

describe("acceptLessonAnswer", () => {
  it("lets the question's author accept, and nobody else", async () => {
    m.findAnswerWithQuestion.mockResolvedValue({
      id: ANSWER_ID,
      questionId: QUESTION_ID,
      question: { userId: "user-1" },
    });
    expect(await acceptLessonAnswer("user-2", ANSWER_ID)).toEqual({
      ok: false,
      error: "Seul l'auteur de la question peut accepter une réponse.",
    });
    expect(m.acceptAnswer).not.toHaveBeenCalled();
    expect(await acceptLessonAnswer("user-1", ANSWER_ID)).toEqual({ ok: true });
    expect(m.acceptAnswer).toHaveBeenCalledWith(ANSWER_ID, QUESTION_ID);
  });

  it("refuses an id that is not one", async () => {
    expect((await acceptLessonAnswer("user-1", 42)).ok).toBe(false);
    expect(m.findAnswerWithQuestion).not.toHaveBeenCalled();
  });
});

describe("upvoteLessonAnswer", () => {
  it.each([
    ["ok", { ok: true }],
    ["already", { ok: true }],
    ["self", { ok: false, error: "Tu ne peux pas voter pour ta propre réponse." }],
    ["notfound", { ok: false, error: "Réponse introuvable." }],
  ])("answers %s as the site does", async (outcome, expected) => {
    m.castUpvote.mockResolvedValue(outcome);
    expect(await upvoteLessonAnswer("user-1", ANSWER_ID)).toEqual(expected);
  });
});
