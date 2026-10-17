import React, { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireRequestUser } from "@/lib/auth";
import { indexPlacements, isReadable } from "@cyberlearn/lib/paths/unlock";
import { unlocksEveryLesson } from "@/lib/lessons/access";
import { extractToc, splitMdxSections } from "@cyberlearn/lib";
import { sectionFromQuery } from "@cyberlearn/lib/revisions/passage";
import {
  friendshipRepository,
  lessonQuizRepository,
  quizReportRepository,
  lessonRepository,
  ratingRepository,
  qaRepository,
  noteRepository,
} from "@cyberlearn/db";
import { LessonRating } from "./_components/lesson-rating";
import { LessonQA } from "./_components/lesson-qa";
import { NextBar } from "./_components/next-bar";
import { LessonAuthor } from "./_components/lesson-author";
import { LessonGlossaryNote } from "./_components/lesson-glossary-note";
import { LessonStepper } from "./_components/lesson-stepper";
import { LessonHeader } from "./_components/lesson-header";
import { SectionPane } from "./_components/section-pane";
import { LESSON_MDX_COMPONENTS } from "./_components/lesson-mdx-components";
import { LessonSection } from "./_components/lesson-section";
import { LESSON_MDX_OPTIONS } from "./_components/lesson-mdx-options";
import { LessonQuizProvider, type QuizAnswer } from "./_components/lesson-quiz-context";

// Not the lesson's own title: the slug alone would put the title of a
// class-only lesson in the tab of anyone who guessed its address.
export const metadata: Metadata = { title: "Leçon" };

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>;
  /** `section`: the section to open on, from 1 ("Revoir ce passage", revisions/passage.ts). */
  searchParams: Promise<{ section?: string | string[] }>;
}

export default async function LessonPage({
  params,
  searchParams,
}: Props): Promise<React.ReactElement> {
  const { slug } = await params;
  const { section: sectionParam } = await searchParams;

  const authUser = await requireRequestUser();

  // Scoped to the reader: a lesson written for a class is published, so
  // looking it up by slug alone would hand it to anyone who guessed one.
  let lesson = await lessonRepository.findBySlug(slug, authUser.id);
  // An administrator may open what nobody else can yet: a draft, to see it as
  // the site renders it before publishing. Nothing is recorded for them on it,
  // and the page says so; the catalogue still lists nothing unpublished.
  let reviewing = false;
  if (!lesson && (await unlocksEveryLesson(authUser.id))) {
    lesson = await lessonRepository.findBySlugForReview(slug);
    reviewing = lesson !== null;
  }
  if (!lesson) notFound();

  const [
    existing,
    pathContexts,
    ratingData,
    userRating,
    questions,
    note,
    quizAnswers,
    reportedQuizIds,
    unlockAll,
    friendIds,
  ] = await Promise.all([
    lessonRepository.findProgress(authUser.id, lesson.id),
    // "Next" used to mean the next lesson published anywhere in the catalogue,
    // by publishedAt. Finishing lesson 3 of the network path could therefore
    // hand the reader a Python lesson that happened to ship the same week, and
    // the path they were working through simply stopped being mentioned. It is
    // the next lesson of *this* path now.
    lessonRepository.findPathContexts(authUser.id, [lesson.id]),
    ratingRepository.findLessonStats(lesson.id),
    ratingRepository.findUserLessonRating(authUser.id, lesson.id),
    qaRepository.findQuestionsByLesson(lesson.id),
    // Tolerate the window between deploy and the prod notes migration: a missing
    // table yields no preloaded note rather than a crashed lesson page.
    noteRepository.findForLesson(authUser.id, lesson.id).catch(() => null),
    // The answers already on record: an answered question stays answered
    // across a reload, and is never asked twice.
    lessonQuizRepository.findForLesson(authUser.id, lesson.id),
    // The questions this learner reported. Like the notes: during the window
    // between a deploy and its migration, no table means nothing preloaded,
    // not a crashed lesson.
    quizReportRepository.openQuizIdsFor(authUser.id, lesson.id).catch(() => []),
    // Administrators review the catalogue: no path lock stands in their way.
    unlocksEveryLesson(authUser.id),
    // The reader's friends, marked beside their names in the questions.
    friendshipRepository.friendIds(authUser.id),
  ]);
  const initialQuizAnswers: Record<string, QuizAnswer> = Object.fromEntries(
    quizAnswers.map((a) => [a.quizId, { selected: a.selected, correct: a.correct }]),
  );

  const placements = indexPlacements(pathContexts.paths, pathContexts.completedLessonIds, {
    unlockAll,
    waivedLessonIds: pathContexts.waivedLessonIds,
  });
  const placement = placements.get(lesson.id);

  // The gate is here, before any progress is written: hiding the card on the
  // catalogue would leave the lesson one guessed URL away, and starting it
  // would mark a locked lesson IN_PROGRESS on the way out.
  if (!isReadable(placement) && placement !== undefined) {
    redirect(`/paths/${placement.path.slug}`);
  }

  const nextLesson = placement?.next ?? null;
  // Read off the same placements as this lesson's gate: the next lesson is
  // open once this one is finished, or for an administrator, or if it was
  // finished already. Until then the bar says so instead of leading to it.
  const nextLocked = nextLesson !== null && !isReadable(placements.get(nextLesson.id));

  if (!existing && !reviewing) {
    await lessonRepository.upsertProgress({
      userId: authUser.id,
      lessonId: lesson.id,
      status: "IN_PROGRESS",
      attempts: 1,
    });
  }

  const progressStatus = existing?.status ?? "IN_PROGRESS";
  const isCompleted = progressStatus === "COMPLETED";

  const toc = extractToc(lesson.contentMdx);
  const sections = toc.filter((t) => t.level === 2);
  const mdxSections = splitMdxSections(lesson.contentMdx);
  // A link back to a passage opens its section, where the reader may open
  // any section already: a lesson they finished (canOpenSection), or an
  // administrator's preview. Anywhere else the lesson starts at its start.
  const initialStep =
    isCompleted || reviewing ? sectionFromQuery(sectionParam, Math.max(1, sections.length)) : 0;

  const stepper = (
    <LessonStepper
      // Another passage of the lesson already on screen opens its section too.
      key={initialStep}
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      xpReward={lesson.xpReward}
      isCompleted={isCompleted}
      reviewing={reviewing}
      sections={sections}
      initialStep={initialStep}
      note={{ content: note?.content ?? "", wordCount: note?.wordCount ?? 0 }}
      planExtra={
        <>
          <Suspense fallback={null}>
            <LessonAuthor lessonId={lesson.id} />
          </Suspense>
          <LessonGlossaryNote />
        </>
      }
    >
      {mdxSections.map((src, i) => (
        // SAFETY: index key is stable - sections don't reorder after page load
        <SectionPane key={i} index={i}>
          {/* Each section fails on its own: one bad expression used to take
            the whole lesson down. See lesson-section.tsx. */}
          <LessonSection
            source={src}
            components={LESSON_MDX_COMPONENTS}
            options={LESSON_MDX_OPTIONS}
            lessonSlug={lesson.slug}
            index={i}
          />
        </SectionPane>
      ))}
    </LessonStepper>
  );

  return (
    <div className="lesson-page">
      <LessonHeader
        title={lesson.title}
        description={lesson.description}
        slug={lesson.slug}
        category={lesson.category}
        difficulty={lesson.difficulty}
        estimatedMinutes={lesson.estimatedMinutes}
        xpReward={lesson.xpReward}
        isCompleted={isCompleted}
        reviewing={reviewing}
      />

      {/* ── Toolbar + the section on screen ──────────────────────────────── */}
      {reviewing ? (
        // No quiz record in review. An answer is written against the progress
        // row that opening a lesson creates, and a draft creates none: every
        // answer came back "Leçon introuvable." and held the section shut.
        // Without the record the quizzes score locally, as in the editor's
        // preview, and nothing is written.
        stepper
      ) : (
        <LessonQuizProvider
          lessonId={lesson.id}
          userId={authUser.id}
          initialAnswers={initialQuizAnswers}
          initialReported={reportedQuizIds}
        >
          {stepper}
        </LessonQuizProvider>
      )}

      {/* ── Next bar ─────────────────────────────────────────────────────────
          Rendered even with no next lesson: it leads back to the path or the
          catalogue. A lesson is finished from the toolbar's "Terminer", at
          the end of its last section. Not in review: a draft is not something
          to finish, rate or ask about. */}
      {!reviewing && (
        <NextBar
          next={nextLesson}
          placement={
            placement
              ? { path: placement.path, rank: placement.rank, total: placement.total }
              : null
          }
          nextLocked={nextLocked}
        />
      )}

      {/* ── Rating + Q&A ─────────────────────────────────────────────────── */}
      {!reviewing && (
        <div className="lesson-rating-qa-grid">
          <LessonRating
            lessonId={lesson.id}
            isCompleted={isCompleted}
            initialScore={userRating?.score ?? null}
            initialFeedback={userRating?.feedback ?? null}
            avgRating={ratingData?.avgRating ?? null}
            ratingsCount={ratingData?.ratingsCount ?? 0}
          />

          <LessonQA
            lessonId={lesson.id}
            lessonSlug={lesson.slug}
            currentUserId={authUser.id}
            questions={questions}
            friendIds={friendIds}
          />
        </div>
      )}
    </div>
  );
}
