import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { EditPathClient } from "./_components/EditPathClient";

export const metadata: Metadata = { title: "Éditer le parcours" };

export default async function EditPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const [path, availableLessons] = await Promise.all([
    prisma.path.findUnique({
      where: { id },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedHours: true,
        coverImageUrl: true,
        status: true,
        lessons: {
          orderBy: { position: "asc" },
          select: {
            position: true,
            lesson: {
              select: {
                id: true,
                refCode: true,
                title: true,
                category: true,
                difficulty: true,
                estimatedMinutes: true,
                xpReward: true,
              },
            },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        refCode: true,
        title: true,
        category: true,
        difficulty: true,
        estimatedMinutes: true,
        xpReward: true,
      },
    }),
  ]);

  if (!path) notFound();

  const currentLessons = path.lessons.map((pl) => pl.lesson);

  return (
    <>
      <Link
        href={`/paths/${id}/quiz`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          padding: "9px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#0AFFD4",
          background: "rgba(10,255,212,0.06)",
          border: "1px solid rgba(10,255,212,0.35)",
          borderRadius: 0,
          textDecoration: "none",
        }}
      >
        Gérer le quiz final →
      </Link>
      <EditPathClient
        path={{
          id: path.id,
          refCode: path.refCode,
          slug: path.slug,
          title: path.title,
          description: path.description,
          category: path.category,
          difficulty: path.difficulty,
          estimatedHours: path.estimatedHours,
          coverImageUrl: path.coverImageUrl ?? "",
          status: path.status,
        }}
        currentLessons={currentLessons}
        availableLessons={availableLessons}
      />
    </>
  );
}
