import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, pathRepository, quizRepository } from "@cyberlearn/db";
import { EXAM_TIME_LIMIT_MINUTES, QUIZ_COOLDOWN_MINUTES, requireUser } from "@cyberlearn/lib";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ExamFlow } from "./_components/exam-flow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = await prisma.path.findUnique({ where: { slug }, select: { title: true } });
  return { title: path ? `Examen — ${path.title}` : "Examen" };
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const authUser = await requireUser(supabase);

  const path = await prisma.path.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, refCode: true },
  });
  if (!path) notFound();

  const [quiz, progress, lessonsComplete] = await Promise.all([
    quizRepository.findActiveQuizByPathId(path.id),
    pathRepository.findProgress(authUser.id, path.id),
    pathRepository.areLessonsComplete(authUser.id, path.id),
  ]);

  const pathCompleted = progress?.status === "COMPLETED";

  // Resume anchor + cooldown are derived from the latest attempt server-side, so
  // the countdown survives a refresh and can't be reset by reloading.
  let resumeStartedAtMs: number | null = null;
  let cooldownUntilMs: number | null = null;
  if (quiz && !pathCompleted) {
    const latest = await quizRepository.findLatestAttempt(authUser.id, quiz.id);
    const now = Date.now();
    if (latest?.submittedAt == null && latest) {
      const elapsedMs = now - latest.startedAt.getTime();
      if (elapsedMs <= EXAM_TIME_LIMIT_MINUTES * 60_000) {
        resumeStartedAtMs = latest.startedAt.getTime();
      }
      // else expired → finalized on the next startQuizAttempt (no resume offered)
    } else if (latest?.submittedAt) {
      const until = latest.submittedAt.getTime() + QUIZ_COOLDOWN_MINUTES * 60_000;
      if (until > now) cooldownUntilMs = until;
    }
  }

  const cert = pathCompleted
    ? await prisma.certificate.findFirst({
        where: { userId: authUser.id, pathId: path.id, revokedAt: null },
        select: { publicId: true },
      })
    : null;

  return (
    <ExamFlow
      pathId={path.id}
      pathSlug={path.slug}
      pathTitle={path.title}
      refCode={path.refCode}
      hasQuiz={quiz !== null}
      lessonsComplete={lessonsComplete}
      pathCompleted={pathCompleted}
      certPublicId={cert?.publicId ?? null}
      questionCount={quiz?.questionsToDraw ?? 0}
      passThreshold={quiz?.passThreshold ?? 70}
      timeLimitMinutes={EXAM_TIME_LIMIT_MINUTES}
      resumeStartedAtMs={resumeStartedAtMs}
      cooldownUntilMs={cooldownUntilMs}
    />
  );
}
