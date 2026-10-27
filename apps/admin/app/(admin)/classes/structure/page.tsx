import React from "react";
import type { Metadata } from "next";
import { classRepository } from "@cyberlearn/db";
import { GhostLink, KpiCard, PageHeader, PrimaryLink } from "../../_components/admin-ui";
import { STRUCTURE_HEADER, STRUCTURE_KPI_LABELS } from "../_components/class-columns";
import { StructureEditor } from "./_components/structure-editor";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Structure" };
export const dynamic = "force-dynamic";

/**
 * Everything above a class: the schools and their intakes.
 *
 * It is a separate route from /classes on purpose. That page answers "which
 * class?", which is asked every day and is why it is a searchable grid. This
 * one answers "what did we set up?", which is asked when a school renames
 * itself or a year ends - rare, and better served by a list you can read in
 * full than by rows filtered out of a bigger one.
 *
 * Archived rows are shown here, unlike everywhere else. A screen whose job
 * includes bringing something back cannot filter out the thing to bring back.
 */
export default async function AdminStructurePage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const establishments = await classRepository.listStructure();

  const promotions = establishments.flatMap((e) => e.promotions);
  const liveEstablishments = establishments.filter((e) => e.archivedAt === null).length;
  const livePromotions = promotions.filter((p) => p.archivedAt === null).length;
  const classCount = promotions.reduce((n, p) => n + p._count.classes, 0);

  return (
    <main className="a-page">
      <PageHeader
        crumbs={STRUCTURE_HEADER.crumbs}
        title={STRUCTURE_HEADER.title}
        description={STRUCTURE_HEADER.description}
        actions={
          <>
            <GhostLink href="/classes">Voir les classes</GhostLink>
            <PrimaryLink href="/classes/new">Créer</PrimaryLink>
          </>
        }
      />

      <div className="a-kpi-grid">
        <KpiCard label={STRUCTURE_KPI_LABELS[0]} value={String(liveEstablishments)} tone="info" />
        <KpiCard label={STRUCTURE_KPI_LABELS[1]} value={String(livePromotions)} tone="info" />
        <KpiCard label={STRUCTURE_KPI_LABELS[2]} value={String(classCount)} tone="accent" />
        <KpiCard
          label={STRUCTURE_KPI_LABELS[3]}
          value={String(
            establishments.length - liveEstablishments + (promotions.length - livePromotions),
          )}
        />
      </div>

      <StructureEditor
        establishments={establishments.map((e) => ({
          id: e.id,
          name: e.name,
          slug: e.slug,
          city: e.city,
          archived: e.archivedAt !== null,
          promotions: e.promotions.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            startYear: p.startYear,
            archived: p.archivedAt !== null,
            classCount: p._count.classes,
          })),
        }))}
      />
    </main>
  );
}
