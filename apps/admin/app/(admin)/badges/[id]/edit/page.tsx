import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { badgeRepository, lessonRepository, pathRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader } from "../../../_components/admin-ui";
import { toggleBadgeActiveAction } from "../../_actions/badge-actions";
import { BADGE_CRUMBS } from "../../_components/badge-columns";
import { EditBadgeForm } from "./_components/edit-badge-form";
import type { LessonOption, PathOption } from "../../new/_components/new-badge-form";

import { requireAdminPage } from "@/lib/auth";
import { routeIdOrNotFound } from "@/lib/route-id";

export const metadata: Metadata = { title: "Éditer le badge" };

export const dynamic = "force-dynamic";

export default async function EditBadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);

  const [badge, lessons, paths] = await Promise.all([
    badgeRepository.findForEdit(id),
    lessonRepository.findCatalogueOptions() satisfies Promise<LessonOption[]>,
    pathRepository.findPublishedOptions() satisfies Promise<PathOption[]>,
  ]);

  if (!badge) notFound();

  return (
    <main className="a-page">
      <PageHeader
        crumbs={BADGE_CRUMBS}
        title={badge.name}
        description={
          <>
            <span className="a-mono">{badge.refCode}</span> · {String(badge._count.userBadges)}{" "}
            utilisateur(s) ont ce badge
          </>
        }
        actions={
          <>
            <form action={toggleBadgeActiveAction}>
              <input type="hidden" name="id" value={badge.id} />
              <button
                type="submit"
                className={badge.isActive ? "a-btn a-btn--danger" : "a-btn a-btn--ghost"}
              >
                {badge.isActive ? "Désactiver" : "Activer"}
              </button>
            </form>
            <GhostLink href="/badges">Retour aux badges</GhostLink>
          </>
        }
      />
      <EditBadgeForm badge={badge} lessons={lessons} paths={paths} />
    </main>
  );
}
