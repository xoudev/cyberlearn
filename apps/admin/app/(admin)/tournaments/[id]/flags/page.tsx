import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { tournamentRepository, type ConsoleSolveRow } from "@cyberlearn/db";
import { KpiCard, PageHeader, Tag } from "../../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../../_components/data-grid";
import { SolveActionsMenu } from "../../_components/solve-actions-menu";
import {
  SOLVE_COLUMNS,
  SOLVE_KPI_LABELS,
  TOURNAMENT_CRUMBS,
  TOURNAMENT_SOLVES_HEADER,
} from "../../_components/tournament-head";
import type { RawParams } from "@/lib/grid-params";
import {
  parseSolveListParams,
  REFERENCE_PAGE_SIZE,
  referenceSearch,
  solveQueryOf,
} from "@/lib/reference-params";
import { routeIdOrNotFound } from "@/lib/route-id";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Flags trouvés" };

const instant = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Who found the flag, as the questions and the row name them. */
function playerOf(row: ConsoleSolveRow): string {
  if (row.user === null) return "Compte supprimé";
  return row.user.username !== null ? `@${row.user.username}` : row.user.displayName;
}

/**
 * A tournament's flags, the latest first, 25 at a time: who found which
 * challenge for which class, and when. A flag shared between teams, or found
 * by a means the rules exclude, is taken back here with a reason; it stays on
 * record so it cannot be scored again, and leaves every scoreboard.
 */
export default async function TournamentFlagsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);
  const filters = parseSolveListParams(await searchParams);
  const tournament = await tournamentRepository.findForConsole(id);
  if (tournament === null) notFound();
  const [slice, disqualified] = await Promise.all([
    tournamentRepository.listSolvesForConsole(solveQueryOf(id, filters)),
    tournamentRepository.countDisqualified(id),
  ]);

  const rows: GridRowBase[] = slice.rows.map((s) => {
    const player = playerOf(s);
    const isDisqualified = s.disqualifiedAt !== null;
    return {
      id: s.id,
      cells: [
        s.userId !== null ? (
          <Link key="p" href={`/users/${s.userId}`} className="a-row-link">
            <span className="a-row-link-title">{player}</span>
          </Link>
        ) : (
          <span key="p" style={{ color: "var(--a-muted)" }}>
            {player}
          </span>
        ),
        <span key="c">{s.challenge.title}</span>,
        <span key="k">{s.class.name}</span>,
        <b
          key="pt"
          className="mono"
          style={{ color: isDisqualified ? "var(--a-muted)" : undefined }}
        >
          {String(s.points)}
        </b>,
        <span key="t" className="mono" style={{ whiteSpace: "nowrap", color: "var(--a-muted)" }}>
          {instant.format(s.solvedAt)}
        </span>,
        isDisqualified ? (
          <span key="s" style={{ display: "grid", gap: 4, maxWidth: 280, whiteSpace: "normal" }}>
            <span>
              <Tag tone="danger">Disqualifié</Tag>
            </span>
            {s.disqualifiedReason !== null && (
              <span style={{ color: "var(--a-muted)", fontSize: 12 }}>{s.disqualifiedReason}</span>
            )}
            <span className="mono" style={{ color: "var(--a-faint)", fontSize: 11 }}>
              {s.disqualifiedAt !== null ? instant.format(s.disqualifiedAt) : ""}
              {s.disqualifiedBy !== null
                ? ` · ${s.disqualifiedBy.username !== null ? `@${s.disqualifiedBy.username}` : s.disqualifiedBy.displayName}`
                : ""}
            </span>
          </span>
        ) : (
          <Tag key="s" tone="success">
            Compte
          </Tag>
        ),
        <SolveActionsMenu
          key="a"
          tournamentId={id}
          solveId={s.id}
          player={player}
          challenge={s.challenge.title}
          disqualified={isDisqualified}
        />,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[...TOURNAMENT_CRUMBS, { label: tournament.title, href: `/tournaments/${id}` }]}
        title={TOURNAMENT_SOLVES_HEADER.title}
        description={TOURNAMENT_SOLVES_HEADER.description}
      />

      <div className="a-kpi-grid">
        <KpiCard
          label={SOLVE_KPI_LABELS[0]}
          value={tournament._count.solves.toLocaleString("fr-FR")}
          tone="accent"
        />
        <KpiCard
          label={SOLVE_KPI_LABELS[1]}
          value={disqualified.toLocaleString("fr-FR")}
          tone="danger"
        />
      </div>

      <DataGrid
        columns={SOLVE_COLUMNS}
        rows={rows}
        server={{
          path: `/tournaments/${id}/flags`,
          params: referenceSearch({ ...filters, page: slice.page }, { status: filters.status }),
          total: slice.total,
          page: slice.page,
          pageSize: REFERENCE_PAGE_SIZE,
        }}
        facets={[
          {
            key: "status",
            label: "Statut",
            value: filters.status,
            options: [
              { value: "valid", label: "Comptent" },
              { value: "disqualified", label: "Disqualifiés" },
            ],
          },
        ]}
        searchPlaceholder="Rechercher un joueur, un défi…"
        emptyTitle="Aucun flag"
        emptyText="Personne n'a encore trouvé de flag dans ce tournoi, ou rien ne répond à ces filtres."
      />
    </main>
  );
}
