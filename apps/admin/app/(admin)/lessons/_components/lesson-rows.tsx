import React from "react";
import Link from "next/link";
import type { ConsoleLessonRow } from "@cyberlearn/db";
import { Tag } from "../../_components/admin-ui";
import type { GridRowBase } from "../../_components/data-grid";
import { StatusBadge } from "../../_components/status-badge";
import { updateLessonStatusAction } from "../_actions/lesson-actions";
import { lessonOrigin } from "@/lib/services/lesson-list.service";
import { DeleteLessonButton } from "./delete-lesson-button";
import { CATEGORY_LABEL, DIFFICULTY_META } from "./lesson-columns";

/** One page of lessons as grid rows, in the order of LESSON_COLUMNS. */
export function lessonGridRows(lessons: readonly ConsoleLessonRow[]): GridRowBase[] {
  return lessons.map((lesson) => {
    const origin = lessonOrigin(lesson.refCode, lesson.audience);
    const difficulty = DIFFICULTY_META[lesson.difficulty];
    return {
      id: lesson.id,
      label: lesson.title,
      cells: [
        // The title leads; ref, slug and length are the line under it.
        <div key="t" style={{ minWidth: 220, maxWidth: 420 }}>
          <Link href={`/lessons/${lesson.id}`} className="a-row-link">
            <span className="a-row-link-title" style={{ fontSize: 14 }}>
              {lesson.title}
            </span>
          </Link>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--a-muted)", marginTop: 3 }}>
            <span style={{ color: "var(--a-fg-2)" }}>{lesson.refCode}</span> · {lesson.slug} ·{" "}
            {String(lesson.estimatedMinutes)} min
          </div>
          {/* Otherwise an admin scanning this list finds a lesson they did
              not commission, cannot see in the catalogue, and has no way to
              tell apart from one that has gone missing. */}
          {origin !== "new" && (
            <div style={{ marginTop: 5 }}>
              <Tag tone={origin === "first" ? "warning" : "info"}>
                {origin === "first" ? "Ancien catalogue" : "Leçon de classe"}
              </Tag>
            </div>
          )}
        </div>,
        <span
          key="c"
          style={{
            fontSize: 12.5,
            color: "var(--a-fg-2)",
            whiteSpace: "nowrap",
          }}
        >
          {CATEGORY_LABEL[lesson.category]}
        </span>,
        <Tag key="d" tone={difficulty.tone}>
          {difficulty.label}
        </Tag>,
        <b key="x" className="a-mono" style={{ color: "var(--a-fg)" }}>
          {String(lesson.xpReward)}
        </b>,
        String(lesson._count.progress),
        lesson.avgRating !== null && lesson.ratingsCount > 0 ? (
          <span key="r" className="mono" style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--a-warning)" }}>
              {lesson.avgRating.toLocaleString("fr-FR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>{" "}
            <span style={{ color: "var(--a-muted)" }}>· {String(lesson.ratingsCount)}</span>
          </span>
        ) : (
          // Nobody rated it yet: no average to show, and none to sort it by.
          <span key="r" style={{ color: "var(--a-faint)" }}>
            -
          </span>
        ),
        // Keyed on the status: the badge keeps the status it was given, so
        // after a bulk change the refreshed row must bring a new one.
        <StatusBadge
          key={`s:${lesson.status}`}
          entityId={lesson.id}
          currentStatus={lesson.status}
          action={updateLessonStatusAction}
        />,
        <DeleteLessonButton
          key="del"
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          disabled={lesson.status === "PUBLISHED" || lesson._count.pathLessons > 0}
          disabledReason={
            lesson.status === "PUBLISHED"
              ? "Archivez la leçon avant de la supprimer"
              : "Cette leçon appartient à un parcours"
          }
        />,
      ],
    };
  });
}
