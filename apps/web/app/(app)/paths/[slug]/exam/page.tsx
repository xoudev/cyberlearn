import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pathsVisibleTo, prisma } from "@cyberlearn/db";
import { requireUser } from "@cyberlearn/lib";
import { examStatus } from "@/lib/exam/exam-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ExamFlow } from "./_components/exam-flow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = await prisma.path.findUnique({ where: { slug }, select: { title: true } });
  return { title: path ? `Examen : ${path.title}` : "Examen" };
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
    where: { slug, ...pathsVisibleTo(authUser.id) },
    select: { id: true, slug: true, title: true, refCode: true },
  });
  if (!path) notFound();

  const status = await examStatus(authUser.id, path.id);

  return (
    <ExamFlow
      pathId={path.id}
      pathSlug={path.slug}
      pathTitle={path.title}
      refCode={path.refCode}
      hasQuiz={status.hasQuiz}
      lessonsComplete={status.lessonsComplete}
      pathCompleted={status.pathCompleted}
      certPublicId={status.certPublicId}
      questionCount={status.questionCount}
      passThreshold={status.passThreshold}
      timeLimitMinutes={status.timeLimitMinutes}
      resumeStartedAtMs={status.resumeStartedAt?.getTime() ?? null}
      cooldownUntilMs={status.cooldownUntil?.getTime() ?? null}
    />
  );
}
