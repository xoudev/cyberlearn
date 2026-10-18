import React from "react";
import type { Metadata } from "next";
import { referenceRepository } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import { formatDay } from "../../users/_components/dates";
import { ReferenceChrome } from "../_components/reference-chrome";
import { SEASON_COLUMNS, SEASONS_HEADER } from "../_components/reference-head";
import type { RawParams } from "@/lib/grid-params";
import {
  parseSeasonListParams,
  REFERENCE_PAGE_SIZE,
  SEASON_STATUS_VALUES,
  seasonListSearch,
  seasonQueryOf,
} from "@/lib/reference-params";
import { SEASON_STATUS_META } from "@/lib/reference-labels";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Saisons" };

/**
 * The league's seasons, the latest first, read-only: the rollover job opens
 * and closes them (see ReferenceChrome). One a week, so the list pages.
 */
export default async function ReferenceSeasonsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseSeasonListParams(await searchParams);
  const slice = await referenceRepository.listSeasons(seasonQueryOf(params));

  const rows: GridRowBase[] = slice.rows.map((s) => {
    const status = SEASON_STATUS_META[s.status];
    return {
      id: s.id,
      cells: [
        <b key="i" className="mono">
          Saison {String(s.index)}
        </b>,
        <span key="b" style={{ whiteSpace: "nowrap" }}>
          {formatDay(s.startsAt)}
        </span>,
        <span key="e" style={{ whiteSpace: "nowrap" }}>
          {formatDay(s.endsAt)}
        </span>,
        s._count.memberships.toLocaleString("fr-FR"),
        <Tag key="s" tone={status.tone}>
          {status.label}
        </Tag>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={SEASONS_HEADER.crumbs}
        title={SEASONS_HEADER.title}
        description={SEASONS_HEADER.description}
      />
      <ReferenceChrome current="seasons" source={SEASONS_HEADER.source} />
      <DataGrid
        columns={SEASON_COLUMNS}
        rows={rows}
        server={{
          path: "/reference/seasons",
          params: seasonListSearch({ ...params, page: slice.page }),
          total: slice.total,
          page: slice.page,
          pageSize: REFERENCE_PAGE_SIZE,
          searchKey: null,
        }}
        facets={[
          {
            key: "status",
            label: "Statut",
            value: params.status,
            options: SEASON_STATUS_VALUES.map((value) => ({
              value,
              label: SEASON_STATUS_META[value].label,
            })),
          },
        ]}
        emptyTitle="Aucune saison"
        emptyText="La ligue n'a pas encore commencé : seed-season.ts ouvre la première saison."
      />
    </main>
  );
}
