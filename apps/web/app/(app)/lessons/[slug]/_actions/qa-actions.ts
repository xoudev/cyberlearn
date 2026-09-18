"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { MODERATION_SURFACE, moderationRepository, qaRepository } from "@cyberlearn/db";
import { checkQaSubmission } from "@/lib/rate-limit";
import { recordQuestProgress } from "@/lib/quests/progress";

const questionSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(10).max(200),
  content: z.string().min(20).max(5000),
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  content: z.string().min(10).max(5000),
});

export interface QaActionResult {
  success: boolean;
  error?: string;
  /**
   * Written, but nobody else can see it yet: the screen flagged it and a
   * moderator has to decide. Said plainly, because a message that appears to
   * post and then is not there reads as a bug.
   */
  heldForReview?: boolean;
}

export async function postQuestionAction(
  lessonId: string,
  title: string,
  content: string,
  lessonSlug: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();

  const qaLimit = await checkQaSubmission(user.id);
  if (!qaLimit.success) {
    return { success: false, error: "Trop de messages. Réessayez dans une minute." };
  }

  const parsed = questionSchema.safeParse({ lessonId, title, content });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: msg };
  }

  // Screened before it is written. The title and the body go through together
  // because an insult in a title is an insult, and screening only the longer
  // field is the kind of gap that gets found immediately.
  const screen = await moderationRepository.screen({
    text: `${title}\n\n${content}`,
    surface: MODERATION_SURFACE.lessonQuestion,
    userId: user.id,
  });

  // Written either way, hidden when the screen flagged it. Turning it away
  // instead used to destroy the message on the spot, so a false positive cost
  // the person what they had written and left a reviewer with an excerpt and
  // nothing to put back.
  const question = await qaRepository.createQuestion({
    lessonId,
    userId: user.id,
    title,
    content,
    isHidden: screen.flagged,
  });
  // The reviewer's decision is carried through to this row, so the id has to
  // be on the event before anybody can act on it.
  if (screen.eventId !== null) {
    await moderationRepository.attachContent(screen.eventId, question.id);
  }
  revalidatePath(`/lessons/${lessonSlug}`);

  return screen.flagged ? { success: true, heldForReview: true } : { success: true };
}

export async function postAnswerAction(
  questionId: string,
  content: string,
  lessonSlug: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();

  const qaLimit = await checkQaSubmission(user.id);
  if (!qaLimit.success) {
    return { success: false, error: "Trop de messages. Réessayez dans une minute." };
  }

  const parsed = answerSchema.safeParse({ questionId, content });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: msg };
  }

  const screen = await moderationRepository.screen({
    text: content,
    surface: MODERATION_SURFACE.lessonAnswer,
    userId: user.id,
  });

  const answer = await qaRepository.createAnswer({
    questionId,
    userId: user.id,
    content,
    isHidden: screen.flagged,
  });
  if (screen.eventId !== null) {
    await moderationRepository.attachContent(screen.eventId, answer.id);
  }
  // Weekly quest: posting a write-up (Q&A answer) this week. Not for a message
  // that is sitting in a moderation queue - if a reviewer destroys it, the
  // progress it earned would stay.
  if (!screen.flagged) {
    await recordQuestProgress(user.id, "FORUM_POST", new Date(), { amount: 1 });
  }
  revalidatePath(`/lessons/${lessonSlug}`);

  return screen.flagged ? { success: true, heldForReview: true } : { success: true };
}

export async function acceptAnswerAction(
  answerId: string,
  lessonSlug: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();

  const answer = await qaRepository.findAnswerWithQuestion(answerId);
  if (!answer) return { success: false, error: "Réponse introuvable." };

  // Only the question author can accept an answer
  if (answer.question.userId !== user.id) {
    return { success: false, error: "Seul l'auteur de la question peut accepter une réponse." };
  }

  await qaRepository.acceptAnswer(answerId, answer.questionId);
  revalidatePath(`/lessons/${lessonSlug}`);

  return { success: true };
}

export async function upvoteAnswerAction(
  answerId: string,
  lessonSlug: string,
): Promise<QaActionResult> {
  const user = await requireRequestUser();

  const z_id = z.string().uuid().safeParse(answerId);
  if (!z_id.success) return { success: false, error: "ID invalide." };

  const outcome = await qaRepository.castUpvote(z_id.data, user.id);
  if (outcome === "notfound") return { success: false, error: "Réponse introuvable." };
  if (outcome === "self") {
    return { success: false, error: "Tu ne peux pas voter pour ta propre réponse." };
  }

  // "ok" and "already" are both a success state: the upvote counts exactly once.
  revalidatePath(`/lessons/${lessonSlug}`);
  return { success: true };
}
