import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { DeleteLessonButton } from "./_components/delete-lesson-button";
import { StatusBadge } from "../_components/status-badge";
import { updateLessonStatusAction } from "./_actions/lesson-actions";

export const metadata: Metadata = { title: "Leçons" };

interface DiffColor {
  color: string;
  bg: string;
}
const DIFF_DEFAULT: DiffColor = { color: "#6B6890", bg: "rgba(42,37,96,0.3)" };
const DIFF_COLORS: Record<string, DiffColor> = {
  BEGINNER: { color: "#0AFFD4", bg: "rgba(10,255,212,0.1)" },
  INTERMEDIATE: { color: "#4D8BFF", bg: "rgba(77,139,255,0.1)" },
  ADVANCED: { color: "#B14DFF", bg: "rgba(177,77,255,0.1)" },
  EXPERT: { color: "#FFB020", bg: "rgba(255,176,32,0.1)" },
};

export default async function AdminLessonsPage(): Promise<React.ReactElement> {
  const lessons = await prisma.lesson.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      refCode: true,
      slug: true,
      title: true,
      category: true,
      difficulty: true,
      status: true,
      xpReward: true,
      estimatedMinutes: true,
      createdAt: true,
      _count: {
        select: {
          progress: { where: { status: "COMPLETED" } },
          pathLessons: true,
        },
      },
    },
  });

  const publishedCount = lessons.filter((l) => l.status === "PUBLISHED").length;
  const draftCount = lessons.filter((l) => l.status === "DRAFT").length;

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B6890",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span
              style={{ width: 14, height: 1, background: "#FF4D6D", display: "inline-block" }}
            />
            Admin / Leçons
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 24,
              fontWeight: 700,
              color: "#F5F5FA",
              margin: 0,
            }}
          >
            Leçons ({String(lessons.length)})
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              margin: "6px 0 0",
            }}
          >
            {String(publishedCount)} publiées · {String(draftCount)} brouillons
          </p>
        </div>

        <Link
          href="/lessons/import"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "#0024FF",
            border: "1px solid #0024FF",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Importer MDX
        </Link>
      </div>

      {/* Table */}
      <div
        className="admin-table-wrap"
        style={{ background: "rgba(5,4,26,0.4)", border: "1px solid #1F1B47" }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 100px 100px 80px 80px 110px 40px",
            padding: "12px 16px",
            borderBottom: "1px solid #1F1B47",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#44406B",
          }}
        >
          <span>Ref</span>
          <span>Titre</span>
          <span>Catégorie</span>
          <span>Difficulté</span>
          <span style={{ textAlign: "right" }}>XP</span>
          <span style={{ textAlign: "right" }}>Compétions</span>
          <span style={{ textAlign: "right" }}>Statut</span>
          <span />
        </div>

        {lessons.length === 0 ? (
          <div
            style={{
              padding: "60px 16px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#6B6890",
            }}
          >
            Aucune leçon. Importez votre premier fichier MDX.
          </div>
        ) : (
          lessons.map((lesson) => {
            const diff = DIFF_COLORS[lesson.difficulty] ?? DIFF_DEFAULT;
            return (
              <div
                key={lesson.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 100px 100px 80px 80px 110px 40px",
                  padding: "12px 16px",
                  borderBottom: "1px solid #1A1640",
                  alignItems: "center",
                  transition: "background 120ms ease",
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#4D8BFF" }}>
                  {lesson.refCode}
                </span>

                <div>
                  <Link
                    href={`/lessons/${lesson.id}/edit`}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#F5F5FA",
                      textDecoration: "none",
                    }}
                  >
                    {lesson.title}
                  </Link>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "#44406B",
                      marginTop: 2,
                    }}
                  >
                    {lesson.slug} · {String(lesson.estimatedMinutes)} min
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "#6B6890",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {lesson.category}
                </span>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: diff.color,
                    background: diff.bg,
                    padding: "2px 8px",
                    display: "inline-block",
                    width: "fit-content",
                  }}
                >
                  {lesson.difficulty}
                </span>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "#0AFFD4",
                    fontWeight: 700,
                    textAlign: "right",
                  }}
                >
                  {String(lesson.xpReward)}
                </span>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#B8B5D1",
                    textAlign: "right",
                  }}
                >
                  {String(lesson._count.progress)}
                </span>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <StatusBadge
                    entityId={lesson.id}
                    currentStatus={lesson.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"}
                    action={updateLessonStatusAction}
                  />
                </div>

                <DeleteLessonButton
                  lessonId={lesson.id}
                  lessonTitle={lesson.title}
                  disabled={lesson.status === "PUBLISHED" || lesson._count.pathLessons > 0}
                  disabledReason={
                    lesson.status === "PUBLISHED"
                      ? "Archivez la leçon avant de la supprimer"
                      : "Cette leçon appartient à un parcours"
                  }
                />
              </div>
            );
          })
        )}
      </div>

      {lessons.length > 0 && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#44406B",
            marginTop: 12,
            textAlign: "right",
          }}
        >
          Dernière mise à jour:{" "}
          {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
