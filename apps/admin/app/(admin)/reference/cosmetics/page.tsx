import React from "react";
import type { Metadata } from "next";
import { referenceRepository } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import { ReferenceChrome } from "../_components/reference-chrome";
import { COSMETIC_COLUMNS, COSMETICS_HEADER } from "../_components/reference-head";
import type { RawParams } from "@/lib/grid-params";
import {
  COSMETIC_TYPE_VALUES,
  cosmeticQueryOf,
  parseCosmeticListParams,
  REFERENCE_PAGE_SIZE,
  referenceSearch,
} from "@/lib/reference-params";
import { COSMETIC_TYPE_LABEL, criterionText, RARITY_META } from "@/lib/reference-labels";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Cosmétiques" };

/**
 * The locker's cosmetics, read-only: the seed rewrites them from
 * cosmetics.json on every run (see ReferenceChrome). Searchable by name or
 * code, filtered by slot, 25 at a time.
 */
export default async function ReferenceCosmeticsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parseCosmeticListParams(await searchParams);
  const slice = await referenceRepository.listCosmetics(cosmeticQueryOf(params));

  const rows: GridRowBase[] = slice.rows.map((c) => {
    const rarity = RARITY_META[c.rarity];
    return {
      id: c.id,
      cells: [
        <span key="n" style={{ display: "grid", gap: 2, maxWidth: 320 }}>
          <span style={{ fontWeight: 600, color: "var(--a-fg)" }}>{c.label}</span>
          <span className="mono" style={{ color: "var(--a-muted)", fontSize: 11 }}>
            {c.code}
          </span>
          {c.description !== null && (
            <span style={{ color: "var(--a-muted)", fontSize: 12, whiteSpace: "normal" }}>
              {c.description}
            </span>
          )}
        </span>,
        <span key="t">{COSMETIC_TYPE_LABEL[c.type]}</span>,
        <Tag key="r" color={rarity.color}>
          {rarity.label}
        </Tag>,
        <span key="c" style={{ whiteSpace: "nowrap" }}>
          {criterionText(c.criterionType, c.criterionData)}
        </span>,
        c._count.unlocks.toLocaleString("fr-FR"),
        <Tag key="s" tone={c.isActive ? "success" : "neutral"}>
          {c.isActive ? "Actif" : "Retiré"}
        </Tag>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={COSMETICS_HEADER.crumbs}
        title={COSMETICS_HEADER.title}
        description={COSMETICS_HEADER.description}
      />
      <ReferenceChrome current="cosmetics" source={COSMETICS_HEADER.source} />
      <DataGrid
        columns={COSMETIC_COLUMNS}
        rows={rows}
        server={{
          path: "/reference/cosmetics",
          params: referenceSearch({ ...params, page: slice.page }, { type: params.type }),
          total: slice.total,
          page: slice.page,
          pageSize: REFERENCE_PAGE_SIZE,
        }}
        facets={[
          {
            key: "type",
            label: "Emplacement",
            value: params.type,
            options: COSMETIC_TYPE_VALUES.map((value) => ({
              value,
              label: COSMETIC_TYPE_LABEL[value],
            })),
          },
        ]}
        searchPlaceholder="Rechercher un nom, un code…"
        emptyTitle="Aucun cosmétique"
        emptyText="Le seed n'a pas encore écrit le catalogue, ou rien ne répond à ces filtres."
      />
    </main>
  );
}
