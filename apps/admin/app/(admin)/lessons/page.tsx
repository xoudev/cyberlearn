import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { LessonsTable, type LessonRow } from "./_components/lessons-table";

export const metadata: Metadata = { title: "Leçons" };

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

  const rows: LessonRow[] = lessons.map((l) => ({
    id: l.id,
    refCode: l.refCode,
    slug: l.slug,
    title: l.title,
    category: l.category,
    difficulty: l.difficulty,
    status: l.status as LessonRow["status"],
    xpReward: l.xpReward,
    estimatedMinutes: l.estimatedMinutes,
    completions: l._count.progress,
    pathLessonsCount: l._count.pathLessons,
  }));

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

      <LessonsTable lessons={rows} />

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
