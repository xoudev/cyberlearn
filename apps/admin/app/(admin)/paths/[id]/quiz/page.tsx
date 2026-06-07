import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, quizRepository } from "@cyberlearn/db";
import { QuizManager } from "./_components/quiz-manager";

export const metadata: Metadata = { title: "Quiz du parcours" };

interface Option {
  id: string;
  text: string;
}

export default async function PathQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;

  const path = await prisma.path.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true },
  });
  if (!path) notFound();

  // Admin reads — these intentionally include correctOptionId (the admin owns the
  // answer key). This path is admin-gated (the (admin) layout) and SEPARATE from
  // the learner serve, which strips the key.
  const quiz = await quizRepository.findQuizByPathAdmin(id);
  const questionsRaw = quiz ? await quizRepository.findQuestionsAdmin(quiz.id) : [];

  const questions = questionsRaw.map((q) => ({
    id: q.id,
    question: q.question,
    // SAFETY: options is authored as [{ id, text }] JSON.
    options: q.options as unknown as Option[],
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    orderIndex: q.orderIndex,
    isActive: q.isActive,
  }));

  return (
    <QuizManager
      path={path}
      quiz={
        quiz
          ? {
              id: quiz.id,
              passThreshold: quiz.passThreshold,
              questionsToDraw: quiz.questionsToDraw,
              isActive: quiz.isActive,
              activeQuestionCount: quiz.activeQuestionCount,
            }
          : null
      }
      questions={questions}
    />
  );
}
