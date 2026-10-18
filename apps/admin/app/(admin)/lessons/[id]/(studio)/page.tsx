import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  LESSON_CONTENT_SELECT,
  lessonContentOf,
  lessonDraftRepository,
  lessonVersionRepository,
  prisma,
  ratingRepository,
} from "@cyberlearn/db";
import { PageHeader, Tag } from "../../../_components/admin-ui";
import { CONTENT_STATUS } from "../../../_components/content-status";
import { RatingsCard } from "../../../_components/ratings-card";
import { LESSON_CRUMBS } from "../../_components/lesson-headers";
import { LessonPlacement, type LessonMembership } from "../_components/lesson-placement";
import { LessonStudio, type StudioVersion } from "../_components/lesson-studio";
import { requireAdminPage } from "@/lib/auth";
import { learnerLessonUrlPrefix } from "@/lib/learner-url";
import { resolveLessonCoverSrc } from "@/lib/lesson-cover/storage";
import { suggestLessonRefCode } from "@/lib/next-ref-code";
import { routeIdOrNotFound } from "@/lib/route-id";

export const metadata: Metadata = { title: "Studio de leçon" };

/** The ratings the lesson's page lists under its studio; the rest are on its ratings page. */
const LATEST_RATINGS = 10;

const PUBLISHED_AT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/**
 * A lesson in the console: its studio (lesson-studio.tsx), then where it sits
 * in the catalogue and what learners thought of it. The whole width of the
 * window, which an editor and a preview side by side need.
 */
export default async function LessonStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdminPage();
  const id = routeIdOrNotFound((await params).id);

  const [lesson, draft, versions, ratings] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id },
      select: {
        ...LESSON_CONTENT_SELECT,
        id: true,
        status: true,
        audience: true,
        version: true,
        avgRating: true,
        ratingsCount: true,
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
    lessonDraftRepository.get(id),
    lessonVersionRepository.list(id),
    // The latest only: the card links to the page that holds every one.
    ratingRepository.findLessonRatings(id, LATEST_RATINGS),
  ]);

  if (!lesson) notFound();

  const { pathLessons, prerequisites, audience } = lesson;
  const pathIds = pathLessons.map((link) => link.path.id);
  const prerequisiteIds = prerequisites.map((p) => p.prerequisiteId);
  // The covers the studio may show: the published one and the draft's.
  const covers = [
    ...new Set(
      [lesson.coverImageUrl, draft?.coverImageUrl].filter(
        (cover): cover is string => typeof cover === "string" && cover !== "",
      ),
    ),
  ];

  const [coverSources, ahead, pathOptions, lessonOptions, codes] = await Promise.all([
    Promise.all(covers.map((cover) => resolveLessonCoverSrc(cover))),
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

  const coverPreviews: Record<string, string> = {};
  covers.forEach((cover, index) => {
    const source = coverSources[index];
    if (source) coverPreviews[cover] = source;
  });

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

  const studioVersions: StudioVersion[] = versions.map((version) => ({
    id: version.id,
    version: version.version,
    source: version.source,
    title: version.title,
    publishedAt: PUBLISHED_AT.format(version.publishedAt),
    publishedBy:
      version.publishedBy === null
        ? null
        : version.publishedBy.username !== null
          ? `@${version.publishedBy.username}`
          : version.publishedBy.displayName,
  }));

  const status = CONTENT_STATUS[lesson.status];

  return (
    <main className="a-page" data-width="full">
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
      <LessonStudio
        lessonId={lesson.id}
        status={lesson.status}
        published={lessonContentOf(lesson)}
        draft={
          draft === null
            ? null
            : { content: lessonContentOf(draft), savedAt: draft.updatedAt.toISOString() }
        }
        currentVersion={lesson.version}
        versions={studioVersions}
        coverPreviews={coverPreviews}
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
      <div className="a-stack">
        <LessonPlacement
          lessonId={lesson.id}
          isClassLesson={audience !== "CATALOGUE"}
          memberships={memberships}
          pathOptions={pathOptions}
          prerequisiteIds={prerequisiteIds}
          lessonOptions={lessonOptions}
        />
        <RatingsCard
          ratings={ratings}
          subject="cette leçon"
          avg={lesson.avgRating}
          count={lesson.ratingsCount}
          allHref={`/lessons/${lesson.id}/ratings`}
        />
      </div>
    </main>
  );
}
