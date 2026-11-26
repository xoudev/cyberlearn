import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lessonQuizRepository } from "@cyberlearn/db";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import { lessonDropoff, STALL_DAYS } from "@cyberlearn/lib/quiz/dropoff";
import { KpiCard, PageHeader } from "../../../_components/admin-ui";
import { DataGrid, type GridRow } from "../../../_components/data-grid";
import {
  LESSON_CRUMBS,
  LESSON_PROGRESS_COLUMNS,
  LESSON_PROGRESS_HEADER,
  LESSON_PROGRESS_KPI_LABELS,
} from "../../_components/lesson-headers";
import { routeIdOrNotFound } from "@/lib/route-id";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Progression d'une leçon" };

/** "42 %", or "-" when there is nothing to divide. */
function share(part: number, whole: number): string {
  if (whole === 0) return "-";
  return `${String(Math.round((part / whole) * 100))} %`;
}

const muted: React.CSSProperties = { color: "var(--a-muted)" };

/**
 * Where learners stop in a lesson: how many started and finished it, and quiz
 * by quiz in the lesson's order, how many answered, how many got it right, and
 * how many stopped right after it (lessonDropoff of @cyberlearn/lib). A quiz
 * after which many stop, or that most get wrong, is the section to rework.
 */
export default async function LessonProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);
  const data = await lessonQuizRepository.dropoffRows(id);
  if (data === null) notFound();

  const funnel = lessonDropoff({
    quizzes: extractLessonQuizzes(data.lesson.contentMdx),
    progress: data.progress,
    answers: data.answers,
    now: new Date(),
  });

  const rows: GridRow[] = [
    {
      id: "before",
      cells: [
        <span key="n" className="mono" style={muted}>
          -
        </span>,
        <span key="q" style={muted}>
          Avant le premier quiz
        </span>,
        <span key="a" style={muted}>
          -
        </span>,
        <span key="c" style={muted}>
          -
        </span>,
        <b key="s" className="mono">
          {funnel.stoppedBeforeFirst}
        </b>,
      ],
      search: "avant le premier quiz",
      sort: [0, "", -1, -1, funnel.stoppedBeforeFirst],
    },
    ...funnel.steps.map(
      (step): GridRow => ({
        id: step.id,
        cells: [
          <span key="n" className="mono">
            {step.position}
          </span>,
          <span key="q" style={{ display: "block", maxWidth: 560, whiteSpace: "normal" }}>
            {step.question}
          </span>,
          <span key="a" className="mono">
            {step.answered}{" "}
            <span style={muted}>({share(step.answered, funnel.started)} des inscrits)</span>
          </span>,
          <span
            key="c"
            className="mono"
            style={{
              color:
                step.answered > 0 && step.correct / step.answered < 0.5
                  ? "var(--a-danger)"
                  : undefined,
            }}
          >
            {share(step.correct, step.answered)}
          </span>,
          <b key="s" className="mono">
            {step.stoppedAfter}
          </b>,
        ],
        search: step.question.toLowerCase(),
        sort: [
          step.position,
          step.question,
          step.answered,
          step.answered === 0 ? -1 : step.correct / step.answered,
          step.stoppedAfter,
        ],
      }),
    ),
  ];

  return (
    <main className="a-page">
      <PageHeader
        crumbs={[...LESSON_CRUMBS, { label: data.lesson.title, href: `/lessons/${id}` }]}
        title={LESSON_PROGRESS_HEADER.title}
        description={LESSON_PROGRESS_HEADER.description}
      />

      <div className="a-kpi-grid">
        <KpiCard
          label={LESSON_PROGRESS_KPI_LABELS[0]}
          value={funnel.started.toLocaleString("fr-FR")}
          delta={`${String(funnel.ongoing)} en cours`}
          tone="accent"
        />
        <KpiCard
          label={LESSON_PROGRESS_KPI_LABELS[1]}
          value={funnel.completed.toLocaleString("fr-FR")}
          delta={`${share(funnel.completed, funnel.started)} des inscrits`}
          tone="success"
        />
        <KpiCard
          label={LESSON_PROGRESS_KPI_LABELS[2]}
          value={funnel.stalled.toLocaleString("fr-FR")}
          delta={`pas revenus depuis ${String(STALL_DAYS)} jours`}
          tone={funnel.stalled > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label={LESSON_PROGRESS_KPI_LABELS[3]}
          value={share(funnel.correctAnswers, funnel.answers)}
          delta={`sur ${funnel.answers.toLocaleString("fr-FR")} réponses aux quiz`}
          tone="info"
        />
      </div>

      <DataGrid
        columns={LESSON_PROGRESS_COLUMNS}
        rows={rows}
        searchPlaceholder="Rechercher une question…"
        emptyTitle="Aucun quiz"
        emptyText="Cette leçon n'a pas de quiz : seuls les chiffres du haut s'appliquent."
      />
    </main>
  );
}
