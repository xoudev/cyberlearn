import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma, ratingRepository } from "@cyberlearn/db";
import { PageHeader, Tag } from "../../../_components/admin-ui";
import { CONTENT_STATUS } from "../../../_components/content-status";
import { RatingsCard } from "../../../_components/ratings-card";
import { LESSON_CRUMBS } from "../../_components/lesson-headers";
import { EditLessonClient } from "./_components/edit-lesson-client";
import { LessonPlacement, type LessonMembership } from "./_components/lesson-placement";
import { learnerLessonUrlPrefix } from "@/lib/learner-url";
import { resolveLessonCoverSrc } from "@/lib/lesson-cover/storage";
import { suggestLessonRefCode } from "@/lib/next-ref-code";

import { requireAdminPage } from "@/lib/auth";
import { routeIdOrNotFound } from "@/lib/route-id";

export const metadata: Metadata = { title: "Éditer la leçon" };

/** The ratings the lesson's page lists under its form; the rest are on its ratings page. */
const LATEST_RATINGS = 10;

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);

  const [lesson, ratings] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedMinutes: true,
        xpReward: true,
        coverImageUrl: true,
        contentMdx: true,
        status: true,
        avgRating: true,
        ratingsCount: true,
        audience: true,
        pathLessons: {
          select: {
            position: true,
            module: { select: { title: true } },
            path: {
              select: { id: true, refCode: true, title: true, status: true, audience: true },
            },
          },
        },
        prerequisites: { select: { prerequisiteId: true } },
      },
    }),
    // The latest only: the card links to the page that holds every one.
    ratingRepository.findLessonRatings(id, LATEST_RATINGS),
  ]);

  if (!lesson) notFound();

  const { pathLessons, prerequisites, audience, avgRating, ratingsCount, ...form } = lesson;
  const pathIds = pathLessons.map((link) => link.path.id);
  const prerequisiteIds = prerequisites.map((p) => p.prerequisiteId);

  const [coverPreview, ahead, pathOptions, lessonOptions, codes] = await Promise.all([
    resolveLessonCoverSrc(lesson.coverImageUrl),
    // The lessons before it in each path. How many gives its place, rather
    // than the stored position: a path the console saved before it numbered
    // from 1 starts at 0. Their codes give the rank a refCode is drawn from,
    // which leaves the module recaps out.
    Promise.all(
      pathLessons.map((link) =>
        prisma.pathLesson.findMany({
          where: { pathId: link.path.id, position: { lt: link.position } },
          select: { lesson: { select: { refCode: true } } },
        }),
      ),
    ),
    prisma.path.findMany({
      where: {
        audience: "CATALOGUE",
        OR: [{ status: { not: "ARCHIVED" } }, { id: { in: pathIds } }],
      },
      orderBy: { refCode: "asc" },
      select: { id: true, refCode: true, title: true, status: true },
    }),
    prisma.lesson.findMany({
      where: {
        NOT: { id },
        OR: [
          { audience: "CATALOGUE", status: { not: "ARCHIVED" } },
          { id: { in: prerequisiteIds } },
        ],
      },
      orderBy: { refCode: "asc" },
      select: { id: true, refCode: true, title: true },
    }),
    prisma.lesson.findMany({
      where: { refCode: { startsWith: "CL-LSN-" } },
      select: { refCode: true },
    }),
  ]);

  const placed = pathLessons
    .map((link, index) => {
      const before = (ahead[index] ?? []).map((row) => row.lesson.refCode);
      const membership: LessonMembership = {
        pathId: link.path.id,
        refCode: link.path.refCode,
        title: link.path.title,
        status: link.path.status,
        isClassPath: link.path.audience !== "CATALOGUE",
        position: before.length + 1,
        moduleTitle: link.module?.title ?? null,
      };
      return { membership, before };
    })
    .sort((a, b) => a.membership.refCode.localeCompare(b.membership.refCode));
  const memberships = placed.map((p) => p.membership);

  const suggestion = suggestLessonRefCode(
    lesson.refCode,
    placed
      .filter((p) => !p.membership.isClassPath)
      .map((p) => ({
        pathRefCode: p.membership.refCode,
        ahead: p.before,
        position: p.membership.position,
        title: p.membership.title,
      })),
    codes.map((c) => c.refCode),
  );

  const status = CONTENT_STATUS[lesson.status];

  return (
    <main className="a-page">
      <PageHeader
        crumbs={LESSON_CRUMBS}
        title={lesson.title}
        description={
          <>
            <span className="a-mono">{lesson.refCode}</span> ·{" "}
            <Tag tone={status.tone}>{status.label}</Tag>
          </>
        }
      />
      <div style={{ marginBottom: 24 }}>
        <LessonPlacement
          lessonId={lesson.id}
          isClassLesson={audience !== "CATALOGUE"}
          memberships={memberships}
          pathOptions={pathOptions}
          prerequisiteIds={prerequisiteIds}
          lessonOptions={lessonOptions}
        />
      </div>
      <EditLessonClient
        lesson={form}
        coverPreview={coverPreview}
        lessonUrlPrefix={learnerLessonUrlPrefix()}
        refCodeSuggestion={
          suggestion === null
            ? null
            : {
                refCode: suggestion.refCode,
                pathTitle: suggestion.from.title,
                position: suggestion.from.position,
              }
        }
      />
      <RatingsCard
        ratings={ratings}
        subject="cette leçon"
        avg={avgRating}
        count={ratingsCount}
        allHref={`/lessons/${lesson.id}/ratings`}
      />
    </main>
  );
}
