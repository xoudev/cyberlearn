import React from "react";
import Link from "next/link";
import { Tag, UI, type Tone } from "../../_components/admin-ui";
import { DataGrid, type GridFacet, type GridRow } from "../../_components/data-grid";
import { StatusBadge } from "../../_components/status-badge";
import { DeletePathButton } from "./delete-path-button";
import { updatePathStatusAction } from "../_actions/path-actions";
import type { PathFolder, PathListRow } from "@/lib/services/path-list.service";

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

const ORIGIN_LABEL: Record<PathListRow["origin"], string> = {
  new: "Nouveau catalogue",
  first: "Ancien catalogue",
  class: "Parcours de classe",
};

/** The paths of one folder, as a searchable, sortable grid. */
export function PathsGrid({
  paths,
  folder,
}: {
  paths: PathListRow[];
  folder: PathFolder;
}): React.ReactElement {
  const rows: GridRow[] = paths.map((p) => {
    const diff = DIFF_META[p.difficulty] ?? { tone: "neutral" as Tone, label: p.difficulty };
    const cat = CAT_LABEL[p.category] ?? p.category;

    return {
      id: p.id,
      search: `${p.title} ${p.slug} ${p.refCode} ${cat} ${diff.label}`.toLowerCase(),
      // Same order as the facets below; the archives have no status facet.
      facets: folder === "active" ? [p.category, p.origin, p.status] : [p.category, p.origin],
      sort: [
        p.title.toLowerCase(),
        cat,
        p.difficulty,
        p.lessons,
        p.completions,
        p.certificates,
        p.avgRating ?? -1,
        p.status,
        0,
      ],
      cells: [
        // The title leads; the reference and the slug are the line under it,
        // rather than a column of their own nobody reads first.
        <Link key="t" href={`/paths/${p.id}/edit`} style={{ display: "block", maxWidth: 340 }}>
          <span
            style={{
              display: "block",
              fontWeight: 600,
              color: UI.fg,
              fontSize: 15,
              marginBottom: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.title}
          </span>
          <span className="mono" style={{ fontSize: 12, color: UI.muted }}>
            <span style={{ color: UI.blueSoft }}>{p.refCode}</span> · {p.slug}
            {p.origin === "first" ? (
              <span style={{ color: UI.warning }}> · ancien catalogue</span>
            ) : null}
          </span>
        </Link>,
        <span
          key="c"
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: UI.fg2,
          }}
        >
          {cat}
        </span>,
        <Tag key="d" tone={diff.tone}>
          {diff.label}
        </Tag>,
        String(p.lessons),
        <b key="p" style={{ color: UI.turquoise }}>
          {String(p.completions)}
        </b>,
        String(p.certificates),
        p.avgRating != null ? (
          <span key="n" style={{ color: UI.warning, fontWeight: 700 }}>
            {p.avgRating.toFixed(1)}
            <span style={{ color: UI.muted, fontWeight: 400 }}> ({String(p.ratingsCount)})</span>
          </span>
        ) : (
          <span key="n" style={{ color: UI.muted }}>
            Aucune
          </span>
        ),
        <StatusBadge
          key="s"
          entityId={p.id}
          currentStatus={p.status}
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

  const facets: GridFacet[] = [
    {
      label: "Catégorie",
      options: Object.entries(CAT_LABEL).map(([value, label]) => ({ value, label })),
    },
    {
      label: "Catalogue",
      options: Object.entries(ORIGIN_LABEL).map(([value, label]) => ({ value, label })),
    },
  ];
  if (folder === "active") {
    facets.push({
      label: "Statut",
      options: [
        { value: "PUBLISHED", label: "Publié" },
        { value: "DRAFT", label: "Brouillon" },
      ],
    });
  }

  return (
    <DataGrid
      columns={[
        { label: "Parcours", sortable: true },
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
      facets={facets}
      searchPlaceholder="Rechercher un parcours…"
      emptyTitle={folder === "archives" ? "Aucun parcours archivé" : "Aucun parcours"}
      emptyText={
        folder === "archives"
          ? "Un parcours archivé depuis la liste des parcours arrive ici."
          : "Crée le premier parcours pour structurer le contenu."
      }
    />
  );
}
