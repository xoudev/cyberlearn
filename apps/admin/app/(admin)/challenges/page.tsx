import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { PageHeader, PrimaryLink, Tag, UI, type Tone } from "../_components/admin-ui";
import { DataGrid, type GridRow } from "../_components/data-grid";
import { ActiveToggle } from "./_components/active-toggle";

export const metadata: Metadata = { title: "Challenges" };

const DIFF_META: Record<string, { tone: Tone; label: string }> = {
  BEGINNER: { tone: "accent", label: "Facile" },
  INTERMEDIATE: { tone: "info", label: "Inter" },
  ADVANCED: { tone: "purple", label: "Avancé" },
  EXPERT: { tone: "warning", label: "Expert" },
};

const TYPE_TONE: Record<string, Tone> = {
  CTF: "danger",
  PUZZLE: "info",
  LAB: "accent",
};

const CAT_LABEL: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

export default async function AdminChallengesPage(): Promise<React.ReactElement> {
  const challenges = await prisma.challenge.findMany({
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      refCode: true,
      slug: true,
      title: true,
      category: true,
      difficulty: true,
      type: true,
      xpReward: true,
      maxAttempts: true,
      isActive: true,
      _count: { select: { progress: { where: { status: "COMPLETED" } } } },
    },
  });

  const activeCount = challenges.filter((c) => c.isActive).length;

  const rows: GridRow[] = challenges.map((c) => {
    const diff = DIFF_META[c.difficulty] ?? { tone: "neutral" as Tone, label: c.difficulty };

    return {
      id: c.id,
      search: `${c.title} ${c.refCode} ${c.slug} ${c.type} ${diff.label}`.toLowerCase(),
      facets: [c.category, c.type, c.isActive ? "active" : "inactive"],
      sort: [
        c.refCode,
        c.title.toLowerCase(),
        c.category,
        c.difficulty,
        c.type,
        c.xpReward,
        c._count.progress,
        c.isActive ? 0 : 1,
        0,
      ],
      cells: [
        <span key="r" className="mono" style={{ color: UI.muted }}>
          {c.refCode}
        </span>,
        <span key="t" style={{ display: "block", maxWidth: 280 }}>
          <span
            style={{
              display: "block",
              fontWeight: 600,
              color: UI.fg,
              fontSize: 13,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {c.title}
          </span>
          <span className="mono" style={{ fontSize: 10, color: UI.muted }}>
            {c.slug}
          </span>
        </span>,
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
          {CAT_LABEL[c.category] ?? c.category}
        </span>,
        <Tag key="d" tone={diff.tone}>
          {diff.label}
        </Tag>,
        <Tag key="ty" tone={TYPE_TONE[c.type] ?? "neutral"}>
          {c.type}
        </Tag>,
        <b key="x" style={{ color: UI.turquoise }}>
          +{String(c.xpReward)}
        </b>,
        String(c._count.progress),
        <ActiveToggle key="a" challengeId={c.id} isActive={c.isActive} />,
        <Link key="e" href={`/challenges/${c.id}/edit`} className="a-btn a-btn--ghost a-btn--sm">
          Éditer
        </Link>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Gamification"
        title="Challenges"
        description={`${String(challenges.length)} challenge${challenges.length !== 1 ? "s" : ""} · ${String(activeCount)} actif${activeCount !== 1 ? "s" : ""}. CTF, puzzles et labs proposés dans la section Défis.`}
        actions={<PrimaryLink href="/challenges/new">Nouveau challenge</PrimaryLink>}
      />

      <DataGrid
        columns={[
          { label: "Ref", sortable: true },
          { label: "Titre", sortable: true },
          { label: "Catégorie", sortable: true },
          { label: "Difficulté", sortable: true },
          { label: "Type", sortable: true },
          { label: "XP", align: "right", sortable: true },
          { label: "Résolus", align: "right", sortable: true },
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
            label: "Type",
            options: [
              { value: "CTF", label: "CTF" },
              { value: "PUZZLE", label: "Puzzle" },
              { value: "LAB", label: "Lab" },
            ],
          },
          {
            label: "Statut",
            options: [
              { value: "active", label: "Actif" },
              { value: "inactive", label: "Inactif" },
            ],
          },
        ]}
        searchPlaceholder="Rechercher un challenge…"
        emptyTitle="Aucun challenge"
        emptyText="Crée le premier challenge pour alimenter la section Défis."
      />
    </main>
  );
}
