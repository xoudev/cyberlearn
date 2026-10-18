import React from "react";
import type { Metadata } from "next";
import { referenceRepository } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../_components/data-grid";
import { CATEGORY_LABEL, DIFFICULTY_META } from "../../lessons/_components/lesson-columns";
import { ReferenceChrome } from "../_components/reference-chrome";
import { PLACEMENT_COLUMNS, PLACEMENT_HEADER } from "../_components/reference-head";
import type { RawParams } from "@/lib/grid-params";
import {
  parsePlacementListParams,
  PLACEMENT_CATEGORY_VALUES,
  PLACEMENT_DIFFICULTY_VALUES,
  placementQueryOf,
  REFERENCE_PAGE_SIZE,
  referenceSearch,
} from "@/lib/reference-params";
import { placementOptions } from "@/lib/reference-labels";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Test de positionnement" };

/**
 * The placement test's questions, read-only: the seed rewrites them (see
 * ReferenceChrome). The right answer is marked, so the team can check the
 * key against the options without opening the seed.
 */
export default async function ReferencePlacementPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const params = parsePlacementListParams(await searchParams);
  const slice = await referenceRepository.listPlacementQuestions(placementQueryOf(params));

  const rows: GridRowBase[] = slice.rows.map((q) => {
    const difficulty = DIFFICULTY_META[q.difficulty];
    const options = placementOptions(q.options);
    return {
      id: q.id,
      cells: [
        <span key="q" style={{ display: "grid", gap: 4, maxWidth: 420, whiteSpace: "normal" }}>
          <span style={{ color: "var(--a-fg)" }}>{q.question}</span>
          {q.explanation !== null && (
            <span style={{ color: "var(--a-muted)", fontSize: 12 }}>{q.explanation}</span>
          )}
        </span>,
        <span key="c">{CATEGORY_LABEL[q.category]}</span>,
        <Tag key="d" tone={difficulty.tone}>
          {difficulty.label}
        </Tag>,
        <ol
          key="o"
          style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 2, whiteSpace: "normal" }}
        >
          {options.map((option) => (
            <li
              key={option.id}
              style={
                option.id === q.correctOptionId
                  ? { color: "var(--a-accent)", fontWeight: 600 }
                  : { color: "var(--a-muted)" }
              }
            >
              {option.text}
              {option.id === q.correctOptionId ? " (bonne réponse)" : ""}
            </li>
          ))}
        </ol>,
        <Tag key="s" tone={q.isActive ? "accent" : "neutral"}>
          {q.isActive ? "Posée" : "Retirée"}
        </Tag>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={PLACEMENT_HEADER.crumbs}
        title={PLACEMENT_HEADER.title}
        description={PLACEMENT_HEADER.description}
      />
      <ReferenceChrome current="placement" source={PLACEMENT_HEADER.source} />
      <DataGrid
        columns={PLACEMENT_COLUMNS}
        rows={rows}
        server={{
          path: "/reference/placement",
          params: referenceSearch(
            { ...params, page: slice.page },
            { category: params.category, difficulty: params.difficulty },
          ),
          total: slice.total,
          page: slice.page,
          pageSize: REFERENCE_PAGE_SIZE,
        }}
        facets={[
          {
            key: "category",
            label: "Domaine",
            value: params.category,
            options: PLACEMENT_CATEGORY_VALUES.map((value) => ({
              value,
              label: CATEGORY_LABEL[value],
            })),
          },
          {
            key: "difficulty",
            label: "Niveau",
            value: params.difficulty,
            options: PLACEMENT_DIFFICULTY_VALUES.map((value) => ({
              value,
              label: DIFFICULTY_META[value].label,
            })),
          },
        ]}
        searchPlaceholder="Rechercher dans les questions…"
        emptyTitle="Aucune question"
        emptyText="Le seed n'a pas encore écrit le test, ou rien ne répond à ces filtres."
      />
    </main>
  );
}
