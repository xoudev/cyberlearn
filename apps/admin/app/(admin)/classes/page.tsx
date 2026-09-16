import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { classRepository } from "@cyberlearn/db";
import { GhostLink, KpiCard, PageHeader, PrimaryLink, Tag, UI } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";

export const metadata: Metadata = { title: "Classes" };
export const dynamic = "force-dynamic";

/**
 * One row per class, searchable and filterable - not a tree.
 *
 * The nesting used to be the layout: establishment, then intake, then a grid of
 * cards, three levels of boxes deep. That reads at three classes and collapses
 * at forty, with no way to search and nothing to sort by. The hierarchy has not
 * gone anywhere - it is what tells you which "SIO1-A" you are looking at when
 * two schools both have one - it just belongs in columns, where it can be
 * filtered on, rather than in frames the eye has to unpick.
 *
 * Creation moved to /classes/new. Setting a school up happens once; finding a
 * class happens every day, and the page a person lands on should be built for
 * the second.
 */
export default async function AdminClassesPage(): Promise<React.ReactElement> {
  const [hierarchy, classes] = await Promise.all([
    classRepository.listHierarchy(),
    classRepository.listAll(),
  ]);

  const totalPromotions = hierarchy.reduce((n, e) => n + e.promotions.length, 0);
  const totalMembers = classes.reduce((n, c) => n + c._count.members, 0);
  const archived = classes.filter((c) => c.archivedAt !== null).length;

  const rows: GridRow[] = classes.map((c) => {
    const establishment = c.promotion.establishment.name;
    const promotion = c.promotion.name;
    const teachers = c.teachers.map((t) => t.teacher.displayName).filter((n) => n.length > 0);
    const isArchived = c.archivedAt !== null;

    return {
      id: c.id,
      search: [c.name, establishment, promotion, ...teachers].join(" ").toLowerCase(),
      sort: [
        c.name,
        establishment,
        promotion,
        c._count.members,
        teachers.length,
        isArchived ? 1 : 0,
      ],
      facets: [c.promotion.establishment.id, c.promotion.id, isArchived ? "archived" : "active"],
      cells: [
        <Link key="n" href={`/classes/${c.id}`} className="a-row-link">
          <span className="a-row-link-title">{c.name}</span>
        </Link>,
        <span key="e" style={{ color: UI.fg2 }}>
          {establishment}
        </span>,
        <span key="p" className="mono" style={{ color: UI.muted, whiteSpace: "nowrap" }}>
          {promotion}
          {c.promotion.startYear !== null && (
            <span style={{ color: UI.faint }}> · {c.promotion.startYear}</span>
          )}
        </span>,
        String(c._count.members),
        <span key="t" style={{ color: teachers.length === 0 ? UI.faint : UI.fg2 }}>
          {teachers.length === 0 ? "—" : teachers.join(", ")}
        </span>,
        <Tag key="s" tone={isArchived ? "neutral" : "accent"}>
          {isArchived ? "Archivée" : "Active"}
        </Tag>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Structure"
        title="Classes"
        description="Une classe appartient à une promo, qui appartient à un établissement. Ouvre une classe pour gérer ses élèves et ses professeurs."
        actions={
          <>
            <GhostLink href="/classes/structure">Structure</GhostLink>
            <PrimaryLink href="/classes/new">Créer</PrimaryLink>
          </>
        }
      />

      <div className="a-kpi-grid">
        <KpiCard label="Établissements" value={String(hierarchy.length)} tone="info" />
        <KpiCard label="Promos" value={String(totalPromotions)} tone="purple" />
        <KpiCard label="Classes" value={String(classes.length - archived)} />
        <KpiCard label="Élèves rattachés" value={String(totalMembers)} tone="accent" />
      </div>

      <DataGrid
        columns={[
          { label: "Classe", sortable: true },
          { label: "Établissement", sortable: true },
          { label: "Promo", sortable: true },
          { label: "Élèves", align: "right", sortable: true },
          { label: "Professeurs", sortable: true },
          { label: "État", sortable: true },
        ]}
        rows={rows}
        facets={[
          {
            label: "Établissement",
            options: hierarchy.map((e) => ({ value: e.id, label: e.name })),
          },
          {
            label: "Promo",
            options: hierarchy.flatMap((e) =>
              e.promotions.map((p) => ({ value: p.id, label: `${e.name} · ${p.name}` })),
            ),
          },
          {
            label: "État",
            options: [
              { value: "active", label: "Active" },
              { value: "archived", label: "Archivée" },
            ],
          },
        ]}
        searchPlaceholder="Rechercher une classe, un établissement, un professeur…"
        emptyTitle={classes.length === 0 ? "Aucune classe" : "Aucun résultat"}
        emptyText={
          classes.length === 0
            ? "Crée un établissement, puis une promo, puis une classe."
            : "Modifie la recherche ou les filtres."
        }
      />
    </main>
  );
}
