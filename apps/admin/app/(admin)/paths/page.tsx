import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { PageHeader, PrimaryLink, Tag, UI, type Tone } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";
import { DeletePathButton } from "./_components/delete-path-button";
import { StatusBadge } from "../_components/status-badge";
import { updatePathStatusAction } from "./_actions/path-actions";

export const metadata: Metadata = { title: "Parcours" };

const DIFF_META: Record<string, { tone: Tone; label: string }> = {
  BEGINNER: { tone: "accent", label: "Débutant" },
  INTERMEDIATE: { tone: "info", label: "Intermédiaire" },
  ADVANCED: { tone: "purple", label: "Avancé" },
  EXPERT: { tone: "warning", label: "Expert" },
};

const CAT_LABEL: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

export default async function AdminPathsPage(): Promise<React.ReactElement> {
  const paths = await prisma.path.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      refCode: true,
      slug: true,
      title: true,
      category: true,
      difficulty: true,
      status: true,
      estimatedHours: true,
      avgRating: true,
      ratingsCount: true,
      createdAt: true,
      _count: {
        select: {
          lessons: true,
          progress: { where: { status: "COMPLETED" } },
          certificates: { where: { revokedAt: null } },
        },
      },
    },
  });

  const publishedCount = paths.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = paths.filter((p) => p.status === "DRAFT").length;

  const rows: GridRow[] = paths.map((p) => {
    const diff = DIFF_META[p.difficulty] ?? { tone: "neutral" as Tone, label: p.difficulty };
    const cat = CAT_LABEL[p.category] ?? p.category;

    return {
      id: p.id,
      search: `${p.title} ${p.slug} ${p.refCode} ${cat} ${diff.label}`.toLowerCase(),
      facets: [p.category, p.status],
      sort: [
        p.refCode,
        p.title.toLowerCase(),
        cat,
        p.difficulty,
        p._count.lessons,
        p._count.progress,
        p._count.certificates,
        p.avgRating ?? -1,
        p.status,
        0,
      ],
      cells: [
        <span key="r" className="mono" style={{ color: UI.faint }}>
          {p.refCode}
        </span>,
        <Link key="t" href={`/paths/${p.id}/edit`} style={{ display: "block", maxWidth: 280 }}>
          <span
            style={{
              display: "block",
              fontWeight: 600,
              color: UI.fg,
              fontSize: 13,
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.title}
          </span>
          <span className="mono" style={{ fontSize: 10, color: UI.faint }}>
            {p.slug}
          </span>
        </Link>,
        <span
          key="c"
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: UI.muted,
          }}
        >
          {cat}
        </span>,
        <Tag key="d" tone={diff.tone}>
          {diff.label}
        </Tag>,
        String(p._count.lessons),
        <b key="p" style={{ color: UI.turquoise }}>
          {String(p._count.progress)}
        </b>,
        String(p._count.certificates),
        p.avgRating != null ? (
          <span key="n" style={{ color: UI.warning, fontWeight: 700 }}>
            {p.avgRating.toFixed(1)}
            <span style={{ color: UI.faint, fontWeight: 400 }}> ({String(p.ratingsCount)})</span>
          </span>
        ) : (
          <span key="n" style={{ color: UI.faint }}>
            Aucune
          </span>
        ),
        <StatusBadge
          key="s"
          entityId={p.id}
          currentStatus={p.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"}
          action={updatePathStatusAction}
        />,
        <span
          key="a"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
        >
          <Link
            href={`/paths/${p.id}/edit`}
            title="Modifier le parcours"
            className="a-btn a-btn--ghost a-btn--sm"
          >
            Éditer
          </Link>
          <DeletePathButton
            pathId={p.id}
            pathTitle={p.title}
            disabled={p.status === "PUBLISHED"}
            disabledReason="Archivez le parcours avant de le supprimer"
          />
        </span>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Contenu"
        title="Parcours"
        description={`${String(publishedCount)} publié${publishedCount !== 1 ? "s" : ""} · ${String(draftCount)} brouillon${draftCount !== 1 ? "s" : ""}. Un parcours publié doit être archivé avant suppression.`}
        actions={<PrimaryLink href="/paths/new">Nouveau parcours</PrimaryLink>}
      />

      <DataGrid
        columns={[
          { label: "Ref", sortable: true },
          { label: "Titre", sortable: true },
          { label: "Catégorie", sortable: true },
          { label: "Difficulté", sortable: true },
          { label: "Leçons", align: "right", sortable: true },
          { label: "Complétions", align: "right", sortable: true },
          { label: "Certifs", align: "right", sortable: true },
          { label: "Note", align: "right", sortable: true },
          { label: "Statut", sortable: true },
          { label: "Actions" },
        ]}
        rows={rows}
        facets={[
          {
            label: "Catégorie",
            options: Object.entries(CAT_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            label: "Statut",
            options: [
              { value: "PUBLISHED", label: "Publié" },
              { value: "DRAFT", label: "Brouillon" },
              { value: "ARCHIVED", label: "Archivé" },
            ],
          },
        ]}
        searchPlaceholder="Rechercher un parcours…"
        emptyTitle="Aucun parcours"
        emptyText="Crée le premier parcours pour structurer le contenu."
      />
    </main>
  );
}
