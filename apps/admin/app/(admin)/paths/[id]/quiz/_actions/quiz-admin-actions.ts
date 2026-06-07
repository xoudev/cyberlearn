"use server";

import { revalidatePath } from "next/cache";
import { prisma, quizRepository } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";
import { questionSchema, quizSettingsSchema } from "./quiz-validation";

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function invalid(error: string, fieldErrors?: Record<string, string>): ActionState {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

function firstFieldErrors(flatten: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flatten)) {
    if (v?.[0]) out[k] = v[0];
  }
  return out;
}

// ── Quiz settings (one per path; pathId @unique → upsert) ─────────────────────

export async function saveQuizSettingsAction(input: {
  pathId: string;
  passThreshold: unknown;
  questionsToDraw: unknown;
  isActive: unknown;
}): Promise<ActionState> {
  const admin = await requireAdminAction();

  const parsed = quizSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return invalid("Réglages invalides.", firstFieldErrors(parsed.error.flatten().fieldErrors));
  }

  const quiz = await quizRepository.upsertQuizByPath({ pathId: input.pathId, ...parsed.data });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "quiz.upsert",
      targetType: "Quiz",
      targetId: quiz.id,
      metadata: { pathId: input.pathId, isActive: parsed.data.isActive },
    },
  });

  revalidatePath(`/paths/${input.pathId}/quiz`);
  return { ok: true };
}

// ── Questions ─────────────────────────────────────────────────────────────────

export async function createQuestionAction(input: {
  quizId: string;
  pathId: string;
  question: unknown;
  options: unknown;
  correctOptionId: unknown;
  explanation?: unknown;
  orderIndex: unknown;
  isActive: unknown;
}): Promise<ActionState> {
  const admin = await requireAdminAction();

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return invalid("Question invalide.", firstFieldErrors(parsed.error.flatten().fieldErrors));
  }
  const d = parsed.data;

  const created = await quizRepository.createQuestion({
    quizId: input.quizId,
    question: d.question,
    options: d.options,
    correctOptionId: d.correctOptionId,
    explanation: d.explanation && d.explanation.length > 0 ? d.explanation : null,
    orderIndex: d.orderIndex,
    isActive: d.isActive,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "quiz_question.create",
      targetType: "QuizQuestion",
      targetId: created.id,
      metadata: { quizId: input.quizId },
    },
  });

  revalidatePath(`/paths/${input.pathId}/quiz`);
  return { ok: true };
}

export async function updateQuestionAction(input: {
  questionId: string;
  pathId: string;
  question: unknown;
  options: unknown;
  correctOptionId: unknown;
  explanation?: unknown;
  orderIndex: unknown;
  isActive: unknown;
}): Promise<ActionState> {
  const admin = await requireAdminAction();

  const existing = await quizRepository.findQuestionById(input.questionId);
  if (!existing) return invalid("Question introuvable.");

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return invalid("Question invalide.", firstFieldErrors(parsed.error.flatten().fieldErrors));
  }
  const d = parsed.data;

  await quizRepository.updateQuestion(input.questionId, {
    question: d.question,
    options: d.options,
    correctOptionId: d.correctOptionId,
    explanation: d.explanation && d.explanation.length > 0 ? d.explanation : null,
    orderIndex: d.orderIndex,
    isActive: d.isActive,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "quiz_question.update",
      targetType: "QuizQuestion",
      targetId: input.questionId,
      metadata: { quizId: existing.quizId },
    },
  });

  revalidatePath(`/paths/${input.pathId}/quiz`);
  return { ok: true };
}

export async function deleteQuestionAction(input: {
  questionId: string;
  pathId: string;
}): Promise<ActionState> {
  const admin = await requireAdminAction();

  const existing = await quizRepository.findQuestionById(input.questionId);
  if (!existing) return invalid("Question introuvable.");

  await quizRepository.deleteQuestion(input.questionId);

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "quiz_question.delete",
      targetType: "QuizQuestion",
      targetId: input.questionId,
      metadata: { quizId: existing.quizId },
    },
  });

  revalidatePath(`/paths/${input.pathId}/quiz`);
  return { ok: true };
}
