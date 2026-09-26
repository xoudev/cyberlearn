import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { PageHeader, PrimaryLink, Tag, UI, type Tone } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";

export const metadata: Metadata = { title: "Badges" };

const RARITY_META: Record<string, { tone: Tone; label: string }> = {
  COMMON: { tone: "neutral", label: "Commun" },
  UNCOMMON: { tone: "accent", label: "Peu commun" },
  RARE: { tone: "info", label: "Rare" },
  EPIC: { tone: "purple", label: "Épique" },
  LEGENDARY: { tone: "warning", label: "Légendaire" },
};

const CRITERION_LABEL: Record<string, string> = {
  LESSON_COMPLETED: "Leçons complétées",
  PATH_COMPLETED: "Parcours complété",
  XP_THRESHOLD: "Seuil XP",
  STREAK_DAYS: "Jours de streak",
  CATEGORY_MASTERY: "Maîtrise catégorie",
  LESSON_SPECIFIC: "Leçon spécifique",
  PERFECT_QUIZ: "Quiz parfait",
  CUSTOM: "Personnalisé",
};

export default async function AdminBadgesPage(): Promise<React.ReactElement> {
  const badges = await prisma.badge.findMany({
    orderBy: [{ rarity: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      refCode: true,
      name: true,
      description: true,
      rarity: true,
      criterionType: true,
      xpReward: true,
      isActive: true,
      createdAt: true,
      _count: { select: { userBadges: true } },
    },
  });

  const activeCount = badges.filter((b) => b.isActive).length;

  const rows: GridRow[] = badges.map((b) => {
    const rarity = RARITY_META[b.rarity] ?? { tone: "neutral" as Tone, label: b.rarity };
    const criterion = CRITERION_LABEL[b.criterionType] ?? b.criterionType;

    return {
      id: b.id,
      search: `${b.name} ${b.description} ${b.refCode} ${rarity.label} ${criterion}`.toLowerCase(),
      facets: [b.rarity, b.isActive ? "active" : "inactive"],
      sort: [
        b.refCode,
        b.name.toLowerCase(),
        b.rarity,
        criterion,
        b.xpReward,
        b._count.userBadges,
        b.isActive ? 0 : 1,
        0,
      ],
      cells: [
        <span key="r" className="mono" style={{ color: UI.muted }}>
          {b.refCode}
        </span>,
        <span key="n" style={{ display: "block", maxWidth: 260 }}>
          <span style={{ display: "block", fontWeight: 600, color: UI.fg, fontSize: 13 }}>
            {b.name}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 11,
              color: UI.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {b.description}
          </span>
        </span>,
        <Tag key="ra" tone={rarity.tone}>
          {rarity.label}
        </Tag>,
        <span key="c" style={{ fontSize: 11.5, color: UI.muted }}>
          {criterion}
        </span>,
        <b key="x" style={{ color: UI.turquoise }}>
          +{String(b.xpReward)}
        </b>,
        String(b._count.userBadges),
        <Tag key="s" tone={b.isActive ? "accent" : "neutral"}>
          {b.isActive ? "Actif" : "Inactif"}
        </Tag>,
        <Link key="e" href={`/badges/${b.id}/edit`} className="a-btn a-btn--ghost a-btn--sm">
          Éditer
        </Link>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Gamification"
        title="Badges"
        description={`${String(badges.length)} badge${badges.length !== 1 ? "s" : ""} · ${String(activeCount)} actif${activeCount !== 1 ? "s" : ""}. Les critères d'attribution sont évalués automatiquement.`}
        actions={<PrimaryLink href="/badges/new">Nouveau badge</PrimaryLink>}
      />

      <DataGrid
        columns={[
          { label: "Ref", sortable: true },
          { label: "Nom", sortable: true },
          { label: "Rareté", sortable: true },
          { label: "Critère", sortable: true },
          { label: "XP", align: "right", sortable: true },
          { label: "Obtenus", align: "right", sortable: true },
          { label: "Statut", sortable: true },
          { label: "Actions" },
        ]}
        rows={rows}
        facets={[
          {
            label: "Rareté",
            options: Object.entries(RARITY_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            })),
          },
          {
            label: "Statut",
            options: [
              { value: "active", label: "Actif" },
              { value: "inactive", label: "Inactif" },
            ],
          },
        ]}
        searchPlaceholder="Rechercher un badge…"
        emptyTitle="Aucun badge"
        emptyText="Crée le premier badge pour lancer la gamification."
      />
    </main>
  );
}
