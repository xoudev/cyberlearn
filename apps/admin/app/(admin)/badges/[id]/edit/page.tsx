import { notFound } from "next/navigation";
import { CATALOGUE_LESSON, prisma } from "@cyberlearn/db";
import { EditBadgeForm } from "./_components/edit-badge-form";
import type { LessonOption, PathOption } from "../../new/_components/new-badge-form";

export const dynamic = "force-dynamic";

export default async function EditBadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const [badge, lessons, paths] = await Promise.all([
    prisma.badge.findUnique({
      where: { id },
      select: {
        id: true,
        refCode: true,
        name: true,
        description: true,
        iconUrl: true,
        rarity: true,
        criterionType: true,
        criterionData: true,
        xpReward: true,
        isActive: true,
        _count: { select: { userBadges: true } },
      },
    }),
    prisma.lesson.findMany({
      // CATALOGUE_LESSON, not just published: a lesson a teacher wrote for one
      // class is published, and putting it behind a badge or inside a path
      // would promise it to people who cannot open it.
      where: CATALOGUE_LESSON,
      select: { id: true, title: true, slug: true, category: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }) satisfies Promise<LessonOption[]>,
    prisma.path.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    }) satisfies Promise<PathOption[]>,
  ]);

  if (!badge) notFound();

  return <EditBadgeForm badge={badge} lessons={lessons} paths={paths} />;
}
