import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lessonRepository, pathRepository, ratingRepository } from "@cyberlearn/db";
import { GhostLink, PageHeader, Tag } from "../../../_components/admin-ui";
import { CONTENT_STATUS } from "../../../_components/content-status";
import { RatingsCard } from "../../../_components/ratings-card";
import { PATH_CRUMBS } from "../../_components/path-columns";
import { EditPathClient } from "./_components/EditPathClient";

import { requireAdminPage } from "@/lib/auth";
import { resolveAvatarSrcs } from "@/lib/avatar";
import { routeIdOrNotFound } from "@/lib/route-id";
import { resolveLessonCoverSrc } from "@/lib/lesson-cover/storage";

export const metadata: Metadata = { title: "Éditer le parcours" };

export default async function EditPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);

  const [path, availableLessons, ratings] = await Promise.all([
    pathRepository.findForEdit(id),
    lessonRepository.findPublishedForPath(),
    ratingRepository.findPathRatings(id),
  ]);

  if (!path) notFound();

  const currentLessons = path.lessons.map((pl) => pl.lesson);
  const status = CONTENT_STATUS[path.status];

  return (
    <main className="a-page">
      <PageHeader
        crumbs={PATH_CRUMBS}
        title={path.title}
        description={
          <>
            <span className="a-mono">{path.refCode}</span> ·{" "}
            <Tag tone={status.tone}>{status.label}</Tag>
          </>
        }
        // The path exists, so its final quiz can be managed: a page of its
        // own, reached from here.
        actions={<GhostLink href={`/paths/${path.id}/quiz`}>Gérer le quiz final</GhostLink>}
      />
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
        coverPreview={await resolveLessonCoverSrc(path.coverImageUrl)}
        currentLessons={currentLessons}
        availableLessons={availableLessons}
      />
      <RatingsCard
        ratings={ratings}
        avatarSrcs={await resolveAvatarSrcs(ratings.map((r) => r.user?.avatarUrl))}
        subject="ce parcours"
        avg={path.avgRating}
        count={path.ratingsCount}
      />
    </main>
  );
}
