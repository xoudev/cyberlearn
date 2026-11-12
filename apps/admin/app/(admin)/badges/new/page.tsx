import type { Metadata } from "next";
import { lessonRepository, pathRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { NEW_BADGE_HEADER } from "../_components/badge-columns";
import { NewBadgeForm } from "./_components/new-badge-form";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Nouveau badge" };

export const dynamic = "force-dynamic";

export default async function NewBadgePage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const [lessons, paths] = await Promise.all([
    lessonRepository.findCatalogueOptions(),
    pathRepository.findPublishedOptions(),
  ]);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={NEW_BADGE_HEADER.crumbs}
        title={NEW_BADGE_HEADER.title}
        actions={<GhostLink href="/badges">Retour aux badges</GhostLink>}
      />
      <NewBadgeForm lessons={lessons} paths={paths} />
    </main>
  );
}
