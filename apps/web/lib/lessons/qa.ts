import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  MODERATION_SURFACE,
  lessonsVisibleTo,
  moderationRepository,
  prisma,
  qaRepository,
} from "@cyberlearn/db";
import { FLAG_BUDGET_MESSAGE, excerpt } from "@cyberlearn/lib";
import { announceModeration } from "@/lib/moderation/announce";
import { checkQaSubmission } from "@/lib/rate-limit";
import { recordQuestProgress } from "@/lib/quests/progress";

/**
 * A lesson's questions and answers: asking, answering, accepting an answer,
 * upvoting one.
 *
 * Shared by the site (qa-actions) and the app (/api/mobile/lesson-qa/*), so a
 * question from a phone is limited, screened, held and announced exactly like
 * one from the site. Callers are responsible for AUTHENTICATION: `userId` must
 * be a verified identity, of an account that is not banned. Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 *
 * Each write checks that the reader can see what it writes on: the lesson
 * (a class's own lesson is only its class's), and for an answer, a question
 * that is still up. The ids come from the client.
 */

const uuid = z.string().uuid();

const questionSchema = z.object({
  lessonId: uuid,
  title: z
    .string()
    .trim()
    .min(10, "Un titre de 10 caractères au minimum.")
    .max(200, "200 caractères au plus pour le titre."),
  content: z
    .string()
    .trim()
    .min(20, "Décris ta question en 20 caractères au minimum.")
    .max(5000, "5000 caractères au plus pour la question."),
});

const answerSchema = z.object({
  questionId: uuid,
  content: z
    .string()
    .trim()
    .min(10, "Une réponse de 10 caractères au minimum.")
    .max(5000, "5000 caractères au plus pour la réponse."),
});

export type QaResult = { ok: true; heldForReview?: true } | { ok: false; error: string };

const TOO_FAST = "Trop de messages. Réessayez dans une minute.";

export async function postLessonQuestion(userId: string, input: unknown): Promise<QaResult> {
  // Shared with the forum on purpose: somebody flooding the site does not care
  // which surface they use.
  const limit = await checkQaSubmission(userId);
  if (!limit.success) return { ok: false, error: TOO_FAST };

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const { lessonId, title, content } = parsed.data;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, ...lessonsVisibleTo(userId) },
    select: { slug: true },
  });
  if (!lesson) return { ok: false, error: "Leçon introuvable." };

  // Screened before it is written. The title and the body go through together
  // because an insult in a title is an insult, and screening only the longer
  // field is the kind of gap that gets found immediately.
  const screen = await moderationRepository.screen({
    text: `${title}\n\n${content}`,
    surface: MODERATION_SURFACE.lessonQuestion,
    userId,
  });

  // Over budget: nothing is written at all, hidden or otherwise. The screen
  // already takes each flagged message out of sight, so this is not about the
  // content - it is about one account filling the queue.
  if (screen.throttled) return { ok: false, error: FLAG_BUDGET_MESSAGE };

  // Written either way, hidden when the screen flagged it, so a false positive
  // does not cost the person what they wrote and a reviewer has it to judge.
  const question = await qaRepository.createQuestion({
    lessonId,
    userId,
    title,
    content,
    isHidden: screen.flagged,
  });
  // The reviewer's decision is carried through to this row, so the id has to
  // be on the event before anybody can act on it.
  if (screen.eventId !== null) {
    await moderationRepository.attachContent(screen.eventId, question.id);
  }
  // Said on the page and again in their inbox: somebody who posted and left
  // would otherwise come back, find nothing, and post it again.
  if (screen.flagged) {
    await announceModeration({
      userId,
      surface: MODERATION_SURFACE.lessonQuestion,
      stage: "held",
      excerpt: excerpt(`${title}\n\n${content}`, 300),
    });
  }
  revalidatePath(`/lessons/${lesson.slug}`);

  return screen.flagged ? { ok: true, heldForReview: true } : { ok: true };
}

export async function postLessonAnswer(userId: string, input: unknown): Promise<QaResult> {
  const limit = await checkQaSubmission(userId);
  if (!limit.success) return { ok: false, error: TOO_FAST };

  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const { questionId, content } = parsed.data;

  const question = await prisma.lessonQuestion.findFirst({
    where: { id: questionId, isHidden: false, lesson: lessonsVisibleTo(userId) },
    select: { lesson: { select: { slug: true } } },
  });
  if (!question) return { ok: false, error: "Question introuvable." };

  const screen = await moderationRepository.screen({
    text: content,
    surface: MODERATION_SURFACE.lessonAnswer,
    userId,
  });

  if (screen.throttled) return { ok: false, error: FLAG_BUDGET_MESSAGE };

  const answer = await qaRepository.createAnswer({
    questionId,
    userId,
    content,
    isHidden: screen.flagged,
  });
  if (screen.eventId !== null) {
    await moderationRepository.attachContent(screen.eventId, answer.id);
  }
  // Weekly quest: posting a write-up this week. Not for a message sitting in
  // a moderation queue: if a reviewer destroys it, the progress would stay.
  if (!screen.flagged) {
    await recordQuestProgress(userId, "FORUM_POST", new Date(), { amount: 1 });
  } else {
    await announceModeration({
      userId,
      surface: MODERATION_SURFACE.lessonAnswer,
      stage: "held",
      excerpt: excerpt(content, 300),
    });
  }
  revalidatePath(`/lessons/${question.lesson.slug}`);

  return screen.flagged ? { ok: true, heldForReview: true } : { ok: true };
}

/** Only the question's author may accept an answer; it resolves the question. */
export async function acceptLessonAnswer(userId: string, answerId: unknown): Promise<QaResult> {
  const id = uuid.safeParse(answerId);
  if (!id.success) return { ok: false, error: "Réponse introuvable." };

  const answer = await qaRepository.findAnswerWithQuestion(id.data);
  if (!answer) return { ok: false, error: "Réponse introuvable." };
  if (answer.question.userId !== userId) {
    return { ok: false, error: "Seul l'auteur de la question peut accepter une réponse." };
  }

  await qaRepository.acceptAnswer(id.data, answer.questionId);
  return { ok: true };
}

/** One upvote per person and answer, never on one's own. */
export async function upvoteLessonAnswer(userId: string, answerId: unknown): Promise<QaResult> {
  const id = uuid.safeParse(answerId);
  if (!id.success) return { ok: false, error: "ID invalide." };

  const outcome = await qaRepository.castUpvote(id.data, userId);
  if (outcome === "notfound") return { ok: false, error: "Réponse introuvable." };
  if (outcome === "self") {
    return { ok: false, error: "Tu ne peux pas voter pour ta propre réponse." };
  }
  // "ok" and "already" are both a success state: the upvote counts exactly once.
  return { ok: true };
}
