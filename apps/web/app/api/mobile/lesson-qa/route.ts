import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { lessonsVisibleTo, prisma, qaRepository } from "@cyberlearn/db";
import { userFromBearer } from "../_lib/auth";

interface QaUser {
  id: string;
  displayName: string | null;
  username: string | null;
  level: number;
}

/** The name the site's Q&A shows. */
function author(user: QaUser | null): { id: string; name: string; level: number } | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.displayName ?? user.username ?? "Utilisateur supprimé",
    level: user.level,
  };
}

/**
 * A lesson's questions and their answers for the mobile user, as the site's
 * lesson page lists them. Through the repository: the Q&A tables are not
 * readable through the Data API (rls_qa_tickets_hardening). `mine` marks the
 * reader's own question (theirs to accept an answer on) and answers (not
 * theirs to upvote).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const lessonId = z.string().uuid().safeParse(request.nextUrl.searchParams.get("lessonId"));
  if (!lessonId.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId.data, ...lessonsVisibleTo(user.id) },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ ok: false, error: "Leçon introuvable." }, { status: 404 });
  }

  const questions = await qaRepository.findQuestionsByLesson(lesson.id);
  return NextResponse.json({
    ok: true,
    questions: questions.map((q) => ({
      id: q.id,
      title: q.title,
      content: q.content,
      isResolved: q.isResolved,
      createdAt: q.createdAt.toISOString(),
      mine: q.user?.id === user.id,
      author: author(q.user),
      answerCount: q._count.answers,
      answers: q.answers.map((a) => ({
        id: a.id,
        content: a.content,
        isAccepted: a.isAccepted,
        upvotes: a.upvotes,
        createdAt: a.createdAt.toISOString(),
        mine: a.user?.id === user.id,
        author: author(a.user),
      })),
    })),
  });
}
