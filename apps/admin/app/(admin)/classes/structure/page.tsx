import React from "react";
import type { Metadata } from "next";
import { classRepository } from "@cyberlearn/db";
import { GhostLink, KpiCard, PageHeader, PrimaryLink } from "../../_components/admin-ui";
import { StructureEditor } from "./_components/structure-editor";

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
  const establishments = await classRepository.listStructure();

  const promotions = establishments.flatMap((e) => e.promotions);
  const liveEstablishments = establishments.filter((e) => e.archivedAt === null).length;
  const livePromotions = promotions.filter((p) => p.archivedAt === null).length;
  const classCount = promotions.reduce((n, p) => n + p._count.classes, 0);

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Structure"
        title="Établissements et promos"
        description="Renommer, corriger un slug, archiver une année. Archiver un établissement retire aussi ses promos et ses classes, sans toucher à leur propre état."
        actions={
          <>
            <GhostLink href="/classes">Voir les classes</GhostLink>
            <PrimaryLink href="/classes/new">Créer</PrimaryLink>
          </>
        }
      />

      <div className="a-kpi-grid">
        <KpiCard label="Établissements actifs" value={String(liveEstablishments)} tone="info" />
        <KpiCard label="Promos actives" value={String(livePromotions)} tone="purple" />
        <KpiCard label="Classes rattachées" value={String(classCount)} tone="accent" />
        <KpiCard
          label="Archivés"
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
