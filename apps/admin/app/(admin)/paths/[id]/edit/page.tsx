import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOGUE_LESSON, prisma, ratingRepository } from "@cyberlearn/db";
import { Card, EmptyState, UI } from "../../../_components/admin-ui";
import { EditPathClient } from "./_components/EditPathClient";

export const metadata: Metadata = { title: "Éditer le parcours" };

export default async function EditPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  const [path, availableLessons, ratings] = await Promise.all([
    prisma.path.findUnique({
      where: { id },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        track: true,
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
      // CATALOGUE_LESSON, not just published: a lesson a teacher wrote for one
      // class is published, and putting it behind a badge or inside a path
      // would promise it to people who cannot open it.
      where: CATALOGUE_LESSON,
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
    ratingRepository.findPathRatings(id),
  ]);

  if (!path) notFound();

  const currentLessons = path.lessons.map((pl) => pl.lesson);

  return (
    <>
      <EditPathClient
        path={{
          id: path.id,
          refCode: path.refCode,
          slug: path.slug,
          title: path.title,
          description: path.description,
          category: path.category,
          track: path.track,
          difficulty: path.difficulty,
          estimatedHours: path.estimatedHours,
          coverImageUrl: path.coverImageUrl ?? "",
          status: path.status,
        }}
        currentLessons={currentLessons}
        availableLessons={availableLessons}
      />
      <PathRatings ratings={ratings} />
    </>
  );
}

type PathRatingRow = Awaited<ReturnType<typeof ratingRepository.findPathRatings>>[number];

/**
 * What learners said about this path: the note, and the comment written to
 * the team. Comments are not shown to other learners.
 */
function PathRatings({ ratings }: { ratings: PathRatingRow[] }): React.ReactElement {
  const dated = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div style={{ marginTop: 24 }}>
      <Card title={`Avis des apprenants (${String(ratings.length)})`} pad>
        {ratings.length === 0 ? (
          <EmptyState title="Aucun avis" text="Personne n'a encore noté ce parcours." />
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <tbody>
                {ratings.map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ color: UI.warning, whiteSpace: "nowrap" }}>
                      {"★".repeat(r.score)}
                      <span style={{ color: UI.muted }}>{"★".repeat(5 - r.score)}</span>
                    </td>
                    <td style={{ width: "100%" }}>
                      {r.feedback ?? <span style={{ color: UI.muted }}>Sans commentaire</span>}
                    </td>
                    <td className="mono" style={{ color: UI.muted, whiteSpace: "nowrap" }}>
                      {r.user?.displayName ?? r.user?.username ?? "Compte supprimé"}
                    </td>
                    <td className="mono" style={{ color: UI.muted, whiteSpace: "nowrap" }}>
                      {dated.format(r.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
