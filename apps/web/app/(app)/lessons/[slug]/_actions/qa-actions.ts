"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { qaRepository } from "@cyberlearn/db";
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

  await qaRepository.createQuestion({ lessonId, userId: user.id, title, content });
  revalidatePath(`/lessons/${lessonSlug}`);

  return { success: true };
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

  await qaRepository.createAnswer({ questionId, userId: user.id, content });
  // Weekly quest: posting a write-up (Q&A answer) this week.
  await recordQuestProgress(user.id, "FORUM_POST", new Date(), { amount: 1 });
  revalidatePath(`/lessons/${lessonSlug}`);

  return { success: true };
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
  await requireRequestUser();

  const z_id = z.string().uuid().safeParse(answerId);
  if (!z_id.success) return { success: false, error: "ID invalide." };

  await qaRepository.incrementUpvotes(answerId);
  revalidatePath(`/lessons/${lessonSlug}`);

  return { success: true };
}
