import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma, quizReportRepository, type ReportedQuiz } from "@cyberlearn/db";
import { extractLessonQuizzes, type LessonQuiz } from "@cyberlearn/lib/mdx-quizzes";
import {
  QUIZ_REPORT_REASON_KEYS,
  QUIZ_REPORT_REASON_LABELS,
} from "@cyberlearn/lib/quiz/report-reasons";
import { EmptyState, GhostLink, PageHeader, Tag } from "../../_components/admin-ui";
import { resolveQuizReportsAction } from "./actions";

export const metadata: Metadata = { title: "Questions signalées" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

function ReportedQuizCard({
  group,
  quiz,
}: {
  group: ReportedQuiz;
  quiz: LessonQuiz | undefined;
}): React.ReactElement {
  const counts = QUIZ_REPORT_REASON_KEYS.map((key) => ({
    key,
    n: group.reports.filter((r) => r.reason === key).length,
  })).filter((c) => c.n > 0);
  return (
    <section className="a-card">
      <div className="a-card-head a-report-head">
        <div className="a-report-title">
          <div className="a-report-meta">
            <span className="a-report-ref">
              {group.lessonRefCode} · {group.quizId}
            </span>
            <Tag tone="warning">
              {group.reports.length} signalement{group.reports.length > 1 ? "s" : ""}
            </Tag>
          </div>
          <Link href={`/lessons/${group.lessonId}/edit`} className="a-report-name">
            {group.lessonTitle}
          </Link>
        </div>
        <form action={resolveQuizReportsAction}>
          <input type="hidden" name="lessonId" value={group.lessonId} />
          <input type="hidden" name="quizId" value={group.quizId} />
          <button type="submit" className="a-btn a-btn--ghost a-btn--sm">
            Marquer comme traité
          </button>
        </form>
      </div>
      <div className="a-card-pad a-report-body">
        {quiz ? (
          <div className="a-report-quiz">
            <p className="a-report-question">{quiz.question}</p>
            <ol className="a-report-options">
              {quiz.options.map((option, i) => (
                <li key={option} data-correct={i === quiz.correct ? "true" : undefined}>
                  {option}
                  {i === quiz.correct ? (
                    <span className="a-report-key"> · bonne réponse</span>
                  ) : null}
                </li>
              ))}
            </ol>
            {quiz.explanation ? (
              <p className="a-report-expl">Explication : {quiz.explanation}</p>
            ) : (
              <p className="a-report-expl">Pas d&apos;explication.</p>
            )}
          </div>
        ) : (
          <p className="a-report-note">
            Cette question n&apos;est plus dans la leçon : elle a été retirée ou renommée depuis.
          </p>
        )}
        <div className="a-report-meta">
          {counts.map((c) => (
            <Tag key={c.key}>
              {QUIZ_REPORT_REASON_LABELS[c.key]} × {c.n}
            </Tag>
          ))}
        </div>
        <ul className="a-report-list">
          {group.reports.map((r) => (
            <li key={r.id}>
              <span className="a-report-small">
                {DATE.format(r.createdAt)} ·{" "}
                {r.username !== null ? `@${r.username}` : "compte supprimé"} ·{" "}
                {QUIZ_REPORT_REASON_LABELS[r.reason]}
              </span>
              {r.comment !== null ? <p>{r.comment}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function QuizReportsPage(): Promise<React.ReactElement> {
  const groups = await quizReportRepository.openByQuiz();
  const lessons = await prisma.lesson.findMany({
    where: { id: { in: [...new Set(groups.map((g) => g.lessonId))] } },
    select: { id: true, contentMdx: true },
  });
  const quizzesByLesson = new Map(lessons.map((l) => [l.id, extractLessonQuizzes(l.contentMdx)]));
  const total = groups.reduce((n, g) => n + g.reports.length, 0);

  return (
    <main className="admin-page-content">
      <PageHeader
        eyebrow="Contenu"
        title="Questions signalées"
        description={
          groups.length === 0
            ? "Les apprenants signalent ici une question de quiz ambiguë, une réponse douteuse ou une faute."
            : `${String(total)} signalement${total > 1 ? "s" : ""} ouvert${total > 1 ? "s" : ""} sur ${String(groups.length)} question${groups.length > 1 ? "s" : ""}, les plus signalées d'abord. Corrige la leçon (éditeur, ou fichier du dépôt puis mise à jour), puis marque la question comme traitée.`
        }
        actions={<GhostLink href="/lessons">Retour aux leçons</GhostLink>}
      />
      {groups.length === 0 ? (
        <EmptyState title="Aucune question signalée" text="Rien à relire pour l'instant." />
      ) : (
        <div className="a-report-cards">
          {groups.map((g) => (
            <ReportedQuizCard
              key={`${g.lessonId}:${g.quizId}`}
              group={g}
              quiz={quizzesByLesson.get(g.lessonId)?.find((q) => q.id === g.quizId)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
