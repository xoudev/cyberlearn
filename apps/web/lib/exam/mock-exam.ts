import { z } from "zod";
import { mockExamRepository, pathsVisibleTo, prisma } from "@cyberlearn/db";
import {
  clientQuestions,
  domainsOf,
  drawMockExam,
  MOCK_MIN_QUESTIONS,
  MOCK_PER_DOMAIN,
  mockTimeLimitMinutes,
  scoreMockExam,
  sourceKey,
  type DomainScore,
  type MockQuestion,
  type MockRef,
  type MockResult,
  type MockSource,
} from "@cyberlearn/lib/exam/mock";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import { groupIntoModules, moduleLabel } from "@cyberlearn/lib/paths/modules";
import { checkQuizStart, checkQuizSubmit } from "@/lib/rate-limit";

/**
 * Mock exams (examens blancs) on a path: a timed draw over its lessons'
 * quizzes, a few questions from each module, scored by module. Practice only:
 * no certificate, no XP, no waiting period.
 *
 * Shared by the site (the mock exam page and its actions) and the app
 * (/api/mobile/mock-exam), so both draw, time and score the same way. The
 * answer key never leaves this module: questions go out without it, and the
 * score is computed here, against the lessons as they are when the attempt
 * is handed in. Callers are responsible for AUTHENTICATION: `userId` must be
 * a verified identity.
 */

export interface MockHistoryItem {
  submittedAt: string;
  score: number;
  late: boolean;
  domains: DomainScore[];
}

export interface MockOverview {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  /** Each module, with the questions it has and the ones an exam draws from it. */
  domains: { domain: string; available: number; drawn: number }[];
  questionCount: number;
  timeLimitMinutes: number;
  /** False when the path has too few quizzes for an exam. */
  ready: boolean;
  /** An attempt still running: the page resumes it. */
  running: { startedAt: string } | null;
  history: MockHistoryItem[];
}

export interface MockStart {
  ok: true;
  attemptId: string;
  startedAt: string;
  timeLimitMinutes: number;
  questions: MockQuestion[];
}

export type MockStartResult = MockStart | { ok: false; error: string };
export type MockSubmitResult =
  | { ok: true; late: boolean; result: MockResult }
  | { ok: false; error: string };

/** A minute of grace for the network, after the time allowed. */
const GRACE_MS = 60_000;

const uuid = z.guid();
const answersSchema = z.record(z.string().regex(/^\d{1,3}$/), z.number().int().min(0).max(25));

/**
 * The quizzes of a path's published lessons, each filed under its module.
 * The duels draw from it too (lib/social/duels.ts).
 */
export async function loadSources(pathId: string): Promise<MockSource[]> {
  const path = await prisma.path.findUnique({
    where: { id: pathId },
    select: {
      modules: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, title: true, description: true },
      },
      lessons: {
        orderBy: { position: "asc" },
        select: {
          moduleId: true,
          lesson: { select: { id: true, status: true, contentMdx: true } },
        },
      },
    },
  });
  if (path === null) return [];
  return groupIntoModules(path.lessons, path.modules).flatMap((group) => {
    const domain = group.title ?? moduleLabel(group);
    return group.indices.flatMap((index): MockSource[] => {
      const lesson = path.lessons[index]?.lesson;
      if (lesson?.status !== "PUBLISHED") return [];
      return extractLessonQuizzes(lesson.contentMdx).map((quiz) => ({
        lessonId: lesson.id,
        quizId: quiz.id,
        domain,
        question: quiz.question,
        options: quiz.options,
        correct: quiz.correct,
        explanation: quiz.explanation,
      }));
    });
  });
}

function keyed(sources: readonly MockSource[]): Map<string, MockSource> {
  return new Map(sources.map((source) => [sourceKey(source.lessonId, source.quizId), source]));
}

/** The refs stored on an attempt, read back defensively: our own JSON. */
function readRefs(value: unknown): MockRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): MockRef[] => {
    if (typeof item !== "object" || item === null) return [];
    // SAFETY: written by startMockExam from MockRef objects; each field is checked below.
    const ref = item as Partial<Record<keyof MockRef, unknown>>;
    if (
      typeof ref.lessonId !== "string" ||
      typeof ref.quizId !== "string" ||
      typeof ref.domain !== "string" ||
      !Array.isArray(ref.order) ||
      !ref.order.every((k): k is number => typeof k === "number")
    ) {
      return [];
    }
    return [{ lessonId: ref.lessonId, quizId: ref.quizId, domain: ref.domain, order: ref.order }];
  });
}

function readDomains(value: unknown): DomainScore[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): DomainScore[] => {
    if (typeof item !== "object" || item === null) return [];
    // SAFETY: written by submitMockExam from DomainScore objects; each field is checked below.
    const d = item as Partial<Record<keyof DomainScore, unknown>>;
    return typeof d.domain === "string" &&
      typeof d.correct === "number" &&
      typeof d.total === "number" &&
      typeof d.percent === "number"
      ? [{ domain: d.domain, correct: d.correct, total: d.total, percent: d.percent }]
      : [];
  });
}

function expired(attempt: { startedAt: Date; timeLimitMinutes: number }, now: number): boolean {
  return now - attempt.startedAt.getTime() > attempt.timeLimitMinutes * 60_000 + GRACE_MS;
}

/** What the mock exam page shows before an attempt, for a path the reader may open. */
export async function mockExamOverview(
  userId: string,
  slug: unknown,
): Promise<MockOverview | null> {
  const parsedSlug = z.string().trim().min(1).max(120).safeParse(slug);
  if (!parsedSlug.success) return null;
  const path = await prisma.path.findFirst({
    where: { slug: parsedSlug.data, ...pathsVisibleTo(userId) },
    select: { id: true, slug: true, title: true },
  });
  if (path === null) return null;

  const [sources, running, history] = await Promise.all([
    loadSources(path.id),
    mockExamRepository.findRunning(userId, path.id),
    mockExamRepository.listHistory(userId, path.id),
  ]);
  const domains = domainsOf(sources).map((d) => ({
    ...d,
    drawn: Math.min(d.available, MOCK_PER_DOMAIN),
  }));
  const questionCount = domains.reduce((n, d) => n + d.drawn, 0);
  const live = running !== null && !expired(running, Date.now()) ? running : null;
  return {
    pathId: path.id,
    pathSlug: path.slug,
    pathTitle: path.title,
    domains,
    questionCount,
    timeLimitMinutes: mockTimeLimitMinutes(questionCount),
    ready: questionCount >= MOCK_MIN_QUESTIONS,
    running: live === null ? null : { startedAt: live.startedAt.toISOString() },
    history: history.map((h) => ({
      submittedAt: (h.submittedAt ?? new Date(0)).toISOString(),
      score: h.score ?? 0,
      late: h.late,
      domains: readDomains(h.domains),
    })),
  };
}

/** Starts an attempt, or resumes the one still running within its time. */
export async function startMockExam(userId: string, rawPathId: unknown): Promise<MockStartResult> {
  const rl = await checkQuizStart(userId);
  if (!rl.success) return { ok: false, error: "Trop de tentatives. Réessaie dans un moment." };
  const pathId = uuid.safeParse(rawPathId);
  if (!pathId.success) return { ok: false, error: "Parcours introuvable." };
  const path = await prisma.path.findFirst({
    where: { id: pathId.data, ...pathsVisibleTo(userId) },
    select: { id: true },
  });
  if (path === null) return { ok: false, error: "Parcours introuvable." };

  const sources = await loadSources(path.id);
  const byKey = keyed(sources);
  const running = await mockExamRepository.findRunning(userId, path.id);
  if (running !== null) {
    if (!expired(running, Date.now())) {
      return {
        ok: true,
        attemptId: running.id,
        startedAt: running.startedAt.toISOString(),
        timeLimitMinutes: running.timeLimitMinutes,
        questions: clientQuestions(readRefs(running.questions), byKey),
      };
    }
    // Left running past its time: practice, so dropped rather than scored.
    await mockExamRepository.discard(running.id);
  }

  const refs = drawMockExam(sources, MOCK_PER_DOMAIN);
  if (refs.length < MOCK_MIN_QUESTIONS) {
    return {
      ok: false,
      error: "Ce parcours n'a pas encore assez de questions pour un examen blanc.",
    };
  }
  const timeLimitMinutes = mockTimeLimitMinutes(refs.length);
  const attempt = await mockExamRepository.create({
    userId,
    pathId: path.id,
    // SAFETY: MockRef is plain data (strings and a number array), valid JSON.
    questions: refs as unknown as object[],
    timeLimitMinutes,
  });
  return {
    ok: true,
    attemptId: attempt.id,
    startedAt: attempt.startedAt.toISOString(),
    timeLimitMinutes,
    questions: clientQuestions(refs, byKey),
  };
}

/** Hands an attempt in and scores it, by domain. Late is scored, and said. */
export async function submitMockExam(
  userId: string,
  rawAttemptId: unknown,
  rawAnswers: unknown,
): Promise<MockSubmitResult> {
  const rl = await checkQuizSubmit(userId);
  if (!rl.success) return { ok: false, error: "Trop d'envois. Réessaie dans un moment." };
  const attemptId = uuid.safeParse(rawAttemptId);
  const answers = answersSchema.safeParse(rawAnswers);
  if (!attemptId.success || !answers.success) return { ok: false, error: "Réponses invalides." };

  const attempt = await mockExamRepository.findById(attemptId.data);
  if (attempt?.userId !== userId) {
    return { ok: false, error: "Examen introuvable." };
  }
  if (attempt.submittedAt !== null) return { ok: false, error: "Cet examen est déjà rendu." };

  const refs = readRefs(attempt.questions);
  const result = scoreMockExam(refs, keyed(await loadSources(attempt.pathId)), answers.data);
  const late = expired(attempt, Date.now());
  const saved = await mockExamRepository.submit(attempt.id, {
    answers: answers.data,
    score: result.score,
    // SAFETY: DomainScore is plain data (a string and numbers), valid JSON.
    domains: result.domains as unknown as object[],
    late,
  });
  if (!saved) return { ok: false, error: "Cet examen est déjà rendu." };
  return { ok: true, late, result };
}
