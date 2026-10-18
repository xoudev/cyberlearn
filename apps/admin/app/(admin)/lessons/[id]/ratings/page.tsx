import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lessonRepository, ratingRepository, type ConsoleRatingRow } from "@cyberlearn/db";
import { KpiCard, PageHeader } from "../../../_components/admin-ui";
import { DataGrid, type GridRowBase } from "../../../_components/data-grid";
import {
  LESSON_CRUMBS,
  LESSON_RATING_COLUMNS,
  LESSON_RATING_KPI_LABELS,
  LESSON_RATINGS_HEADER,
} from "../../_components/lesson-headers";
import type { RawParams } from "@/lib/grid-params";
import {
  parseRatingListParams,
  RATING_SCORE_VALUES,
  ratingQueryOf,
  REFERENCE_PAGE_SIZE,
  referenceSearch,
} from "@/lib/reference-params";
import { routeIdOrNotFound } from "@/lib/route-id";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Avis d'une leçon" };

const dated = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Who rated, as the rest of the console names a learner. */
function learnerOf(row: ConsoleRatingRow): string {
  if (row.user === null) return "Compte supprimé";
  return row.user.username !== null ? `@${row.user.username}` : row.user.displayName;
}

/**
 * Every rating of a lesson, 25 at a time, the newest first: the score, the
 * comment written to the team, who wrote it and when. The lesson's edit page
 * shows the latest few and links here, so none of them is out of reach.
 */
export default async function LessonRatingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);
  const filters = parseRatingListParams(await searchParams);
  const [lesson, slice] = await Promise.all([
    lessonRepository.findRatingTotals(id),
    ratingRepository.listLessonRatingsForConsole(ratingQueryOf(id, filters)),
  ]);
  if (lesson === null) notFound();

  const rows: GridRowBase[] = slice.rows.map((r) => {
    const learner = learnerOf(r);
    return {
      id: r.id,
      cells: [
        <span
          key="s"
          className="mono"
          style={{ color: "var(--a-warning)", whiteSpace: "nowrap" }}
          aria-label={`${String(r.score)} sur 5`}
        >
          {"★".repeat(r.score)}
          <span style={{ color: "var(--a-muted)" }}>{"★".repeat(5 - r.score)}</span>
        </span>,
        <span key="f" style={{ display: "block", maxWidth: 520, whiteSpace: "normal" }}>
          {r.feedback ?? <span style={{ color: "var(--a-muted)" }}>Sans commentaire</span>}
        </span>,
        r.userId !== null ? (
          <Link key="u" href={`/users/${r.userId}`} className="a-row-link">
            <span className="a-row-link-title">{learner}</span>
          </Link>
        ) : (
          <span key="u" style={{ color: "var(--a-muted)" }}>
            {learner}
          </span>
        ),
        <span key="d" className="mono" style={{ color: "var(--a-muted)", whiteSpace: "nowrap" }}>
          {dated.format(r.updatedAt)}
        </span>,
      ],
    };
  });

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[...LESSON_CRUMBS, { label: lesson.title, href: `/lessons/${id}/edit` }]}
        title={LESSON_RATINGS_HEADER.title}
        description={LESSON_RATINGS_HEADER.description}
      />

      <div className="a-kpi-grid">
        <KpiCard
          label={LESSON_RATING_KPI_LABELS[0]}
          value={
            lesson.avgRating !== null && lesson.ratingsCount > 0
              ? `${lesson.avgRating.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`
              : "-"
          }
          tone="warning"
        />
        <KpiCard
          label={LESSON_RATING_KPI_LABELS[1]}
          value={lesson.ratingsCount.toLocaleString("fr-FR")}
          tone="accent"
        />
      </div>

      <DataGrid
        columns={LESSON_RATING_COLUMNS}
        rows={rows}
        server={{
          path: `/lessons/${id}/ratings`,
          params: referenceSearch({ ...filters, page: slice.page }, { score: filters.score }),
          total: slice.total,
          page: slice.page,
          pageSize: REFERENCE_PAGE_SIZE,
        }}
        facets={[
          {
            key: "score",
            label: "Note",
            value: filters.score,
            options: RATING_SCORE_VALUES.map((score) => ({
              value: score,
              label: `${score} sur 5`,
            })),
          },
        ]}
        searchPlaceholder="Rechercher un commentaire, un apprenant…"
        emptyTitle="Aucun avis"
        emptyText="Personne n'a encore noté cette leçon, ou aucun avis ne répond à ces filtres."
      />
    </main>
  );
}
