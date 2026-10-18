import React from "react";
import type { Metadata } from "next";
import { referenceRepository } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import { ReferenceChrome } from "../_components/reference-chrome";
import { QUEST_COLUMNS, QUESTS_HEADER } from "../_components/reference-head";
import type { RawParams } from "@/lib/grid-params";
import {
  parseQuestListParams,
  QUEST_TYPE_VALUES,
  questQueryOf,
  REFERENCE_PAGE_SIZE,
  referenceSearch,
} from "@/lib/reference-params";
import { QUEST_TYPE_LABEL } from "@/lib/reference-labels";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Quêtes" };

/** The weekly quests, read-only: their migration wrote them (see ReferenceChrome). */
export default async function ReferenceQuestsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseQuestListParams(await searchParams);
  const slice = await referenceRepository.listQuests(questQueryOf(params));

  const rows: GridRowBase[] = slice.rows.map((q) => ({
    id: q.id,
    cells: [
      <span key="n" style={{ display: "grid", gap: 2, maxWidth: 360 }}>
        <span style={{ fontWeight: 600, color: "var(--a-fg)" }}>{q.title}</span>
        <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
          {q.code}
        </span>
        <span style={{ color: "var(--a-muted)", fontSize: 12, whiteSpace: "normal" }}>
          {q.description}
        </span>
      </span>,
      <span key="t">{QUEST_TYPE_LABEL[q.type]}</span>,
      q.target.toLocaleString("fr-FR"),
      <b key="x" style={{ color: "var(--a-accent)" }}>
        {q.xpReward.toLocaleString("fr-FR")}
      </b>,
      q.freezeReward.toLocaleString("fr-FR"),
      <Tag key="s" tone={q.isActive ? "accent" : "neutral"}>
        {q.isActive ? "Active" : "Retirée"}
      </Tag>,
    ],
  }));

  return (
    <main className="a-page">
      <PageHeader
        crumbs={QUESTS_HEADER.crumbs}
        title={QUESTS_HEADER.title}
        description={QUESTS_HEADER.description}
      />
      <ReferenceChrome current="quests" source={QUESTS_HEADER.source} />
      <DataGrid
        columns={QUEST_COLUMNS}
        rows={rows}
        server={{
          path: "/reference/quests",
          params: referenceSearch({ ...params, page: slice.page }, { type: params.type }),
          total: slice.total,
          page: slice.page,
          pageSize: REFERENCE_PAGE_SIZE,
        }}
        facets={[
          {
            key: "type",
            label: "Type",
            value: params.type,
            options: QUEST_TYPE_VALUES.map((value) => ({ value, label: QUEST_TYPE_LABEL[value] })),
          },
        ]}
        searchPlaceholder="Rechercher un titre, un code…"
        emptyTitle="Aucune quête"
        emptyText="Rien ne répond à ces filtres."
      />
    </main>
  );
}
