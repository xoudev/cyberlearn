import { CATALOGUE_LESSON, prisma } from "@cyberlearn/db";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { NewBadgeForm } from "./_components/new-badge-form";

import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewBadgePage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const [lessons, paths] = await Promise.all([
    prisma.lesson.findMany({
      // CATALOGUE_LESSON, not just published: a lesson a teacher wrote for one
      // class is published, and putting it behind a badge or inside a path
      // would promise it to people who cannot open it.
      where: CATALOGUE_LESSON,
      select: { id: true, title: true, slug: true, category: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
    prisma.path.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[{ label: "Gamification" }, { label: "Badges", href: "/badges" }]}
        title="Créer un badge"
        actions={<GhostLink href="/badges">Retour aux badges</GhostLink>}
      />
      <NewBadgeForm lessons={lessons} paths={paths} />
    </main>
  );
}
