import React from "react";
import Link from "next/link";
import type {
  ConsoleExamAttempt,
  lessonProgressRepository,
  pathRepository,
  ProgressStatus,
} from "@cyberlearn/db";
import { examWait } from "@/lib/user-record";
import { Card, Tag, type Tone } from "../../../_components/admin-ui";
import { formatDay } from "../../_components/dates";
import {
  LessonCorrectionForm,
  PlacementResetButton,
  WaiveCooldownButton,
} from "./progress-actions";

type PathRow = Awaited<ReturnType<typeof pathRepository.findProgressForConsole>>[number];
type LessonRow = Awaited<ReturnType<typeof lessonProgressRepository.recentForConsole>>[number];

const LESSON_STATUS: Record<ProgressStatus, { label: string; tone: Tone }> = {
  NOT_STARTED: { label: "pas commencée", tone: "neutral" },
  IN_PROGRESS: { label: "en cours", tone: "warning" },
  COMPLETED: { label: "terminée", tone: "accent" },
};

const stamp = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/**
 * What the account learned: the placement test, the paths it opened with
 * their exams, the lessons it touched last, and the corrections support can
 * make to each. Read on the server; the corrections are the client islands.
 */
export function ProgressPanel({
  userId,
  placement,
  placementWaivers,
  paths,
  exams,
  lessons,
  lessonCounts,
  now,
}: {
  userId: string;
  placement: {
    devScore: number;
    cybersecScore: number;
    networkScore: number;
    completedAt: Date;
  } | null;
  /** Lessons the placement test waived, still on the account. */
  placementWaivers: number;
  paths: PathRow[];
  exams: ConsoleExamAttempt[];
  lessons: LessonRow[];
  lessonCounts: { completed: number; inProgress: number };
  now: Date;
}): React.ReactElement {
  const examByPath = new Map(exams.map((exam) => [exam.pathId, exam]));
  // An exam sat on a path whose page was never opened has no progress row;
  // it still belongs in the list.
  const pathIds = new Set(paths.map((path) => path.pathId));
  const examOnly = exams.filter((exam) => !pathIds.has(exam.pathId));

  return (
    <Card
      title="Progression"
      action={
        <span className="mono a-field-hint">
          {lessonCounts.completed} leçon{lessonCounts.completed > 1 ? "s" : ""} terminée
          {lessonCounts.completed > 1 ? "s" : ""} · {lessonCounts.inProgress} en cours
        </span>
      }
    >
      <div className="a-card-pad">
        <h3 className="a-subhead" style={{ marginTop: 0 }}>
          Test de positionnement
        </h3>
        {placement === null ? (
          <p className="a-field-hint">
            Pas passé. Il se propose à la fin de l&apos;inscription, une seule fois.
          </p>
        ) : (
          <>
            <p className="a-field-hint">
              Développement {placement.devScore} % · cybersécurité {placement.cybersecScore} % ·
              réseau {placement.networkScore} %, passé le {formatDay(placement.completedAt)}.{" "}
              {placementWaivers > 0
                ? `${String(placementWaivers)} leçon${placementWaivers > 1 ? "s dispensées" : " dispensée"}.`
                : "Aucune leçon dispensée."}
            </p>
            <PlacementResetButton userId={userId} />
          </>
        )}

        <h3 className="a-subhead">Parcours et examens</h3>
        {paths.length + examOnly.length === 0 ? (
          <p className="a-field-hint">Ce compte n&apos;a ouvert aucun parcours.</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {paths.map((path) => (
                  <tr key={path.pathId}>
                    <td>
                      <Link href={`/paths/${path.pathId}/edit`} className="a-row-link">
                        <span className="a-row-link-title">{path.title}</span>
                      </Link>
                      <div className="mono a-field-hint">
                        {path.completedLessons}/{path.lessonCount} missions
                        {path.hasCertificate ? " · attestation" : ""}
                      </div>
                    </td>
                    <td>
                      <Tag tone={path.status === "COMPLETED" ? "accent" : "warning"}>
                        {path.status === "COMPLETED" ? "terminé" : "en cours"}
                      </Tag>
                    </td>
                    <td align="right">
                      <ExamCell
                        userId={userId}
                        pathId={path.pathId}
                        pathTitle={path.title}
                        exam={examByPath.get(path.pathId) ?? null}
                        now={now}
                      />
                    </td>
                  </tr>
                ))}
                {examOnly.map((exam) => (
                  <tr key={exam.pathId}>
                    <td>
                      <Link href={`/paths/${exam.pathId}/edit`} className="a-row-link">
                        <span className="a-row-link-title">{exam.pathTitle}</span>
                      </Link>
                    </td>
                    <td>
                      <Tag tone="neutral">examen seul</Tag>
                    </td>
                    <td align="right">
                      <ExamCell
                        userId={userId}
                        pathId={exam.pathId}
                        pathTitle={exam.pathTitle}
                        exam={exam}
                        now={now}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="a-subhead">Dernières leçons</h3>
        {lessons.length === 0 ? (
          <p className="a-field-hint">Ce compte n&apos;a ouvert aucune leçon.</p>
        ) : (
          <>
            <div className="a-table-wrap">
              <table className="a-table">
                <tbody>
                  {lessons.map((lesson) => {
                    const status = LESSON_STATUS[lesson.status];
                    return (
                      <tr key={lesson.lessonId}>
                        <td>
                          <span className="a-row-link-title">{lesson.lesson.title}</span>
                          <div className="mono a-field-hint">
                            vue le {formatDay(lesson.lastAccessedAt)}
                            {lesson.quizTotal !== null && lesson.quizCorrect !== null
                              ? ` · quiz ${String(lesson.quizCorrect)}/${String(lesson.quizTotal)}`
                              : ""}
                          </div>
                        </td>
                        <td align="right">
                          <Tag tone={status.tone}>{status.label}</Tag>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="a-subhead">Corriger une leçon</h3>
            <p className="a-field-hint" style={{ marginBottom: 12 }}>
              Pour une leçon bloquée dans un état dont la personne ne peut pas sortir seule. La
              remettre à zéro efface sa progression, ses réponses aux quiz et ses cartes de révision
              ; la marquer terminée ne rapporte ni XP, ni série, ni badge. Un parcours déjà terminé
              le reste, et aucune attestation n&apos;est émise d&apos;ici.
            </p>
            <LessonCorrectionForm
              userId={userId}
              lessons={lessons.map((lesson) => ({
                id: lesson.lessonId,
                title: lesson.lesson.title,
                status: LESSON_STATUS[lesson.status].label,
              }))}
            />
          </>
        )}
      </div>
    </Card>
  );
}

/** The latest attempt at a path's exam, and the wait it left. */
function ExamCell({
  userId,
  pathId,
  pathTitle,
  exam,
  now,
}: {
  userId: string;
  pathId: string;
  pathTitle: string;
  exam: ConsoleExamAttempt | null;
  now: Date;
}): React.ReactElement {
  if (exam === null) return <span className="mono a-field-hint">examen jamais tenté</span>;
  if (exam.passed && exam.submittedAt !== null) {
    return (
      <span className="mono a-field-hint">
        examen réussi ({exam.score} %) le {formatDay(exam.submittedAt)}
      </span>
    );
  }

  const wait = examWait(exam, now);
  switch (wait.state) {
    case "running":
      return (
        <span className="mono a-field-hint">
          examen commencé le {stamp.format(exam.startedAt)}, pas rendu
        </span>
      );
    case "waived":
      return (
        <span className="mono a-field-hint">
          échoué ({exam.score} %) · délai levé le {stamp.format(wait.at)}
        </span>
      );
    case "open":
      return <span className="mono a-field-hint">échoué ({exam.score} %) · peut être repassé</span>;
    case "waiting":
      return (
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span className="mono a-field-hint">
            échoué ({exam.score} %) · rouvre le {stamp.format(wait.until)}
          </span>
          <WaiveCooldownButton userId={userId} pathId={pathId} pathTitle={pathTitle} />
        </div>
      );
  }
}
