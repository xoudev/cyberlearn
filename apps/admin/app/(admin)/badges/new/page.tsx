import { prisma } from "@cyberlearn/db";
import { NewBadgeForm } from "./_components/new-badge-form";

export const dynamic = "force-dynamic";

export default async function NewBadgePage(): Promise<React.ReactElement> {
  const [lessons, paths] = await Promise.all([
    prisma.lesson.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, category: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
    prisma.path.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return <NewBadgeForm lessons={lessons} paths={paths} />;
}
