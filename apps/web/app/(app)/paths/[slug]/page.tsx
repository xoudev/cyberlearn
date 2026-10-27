import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "./path-detail.css";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { indexPlacements, type LockState, resumeLesson } from "@cyberlearn/lib/paths/unlock";
import { unlocksEveryLesson } from "@/lib/lessons/access";
import { requireUser } from "@cyberlearn/lib";
import { groupIntoModules } from "@cyberlearn/lib/paths/modules";
import { isCertifiablePath } from "@cyberlearn/lib/paths/certificate";
import {
  PUBLISHED_PATH_LESSON,
  lessonRepository,
  pathsVisibleTo,
  prisma,
  ratingRepository,
} from "@cyberlearn/db";
import { visiblePathTitle } from "@/lib/paths/visible-title";
import { BossNode } from "./_components/boss-node";
import { BriefCertificate } from "./_components/brief-certificate";
import { MockExamDialog } from "./_components/mock-exam-dialog";
import { PathRating } from "./_components/path-rating";
import { PathCurriculum } from "./_components/path-curriculum";
import { Crumb } from "@/components/crumb";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { averageLine, formatAverage } from "@cyberlearn/lib/content/rating";
import { ProgressBar } from "@/components/progress-bar";
import { StickyRail } from "@/components/sticky-rail";
import { builtInPathCover, resolvePathCovers } from "@/lib/paths/cover";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: (await visiblePathTitle(slug)) ?? "Parcours" };
}

import { CatalogueArtwork } from "@/components/catalogue-artwork";

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const authUser = await requireUser(supabase);

  const path = await prisma.path.findFirst({
    // Not findUnique on the slug: a CLASS path is published, so the reader is
    // part of the question. findUnique takes only unique fields, which is how
    // the entitlement would have been left out.
    where: { slug, ...pathsVisibleTo(authUser.id) },
    include: {
      modules: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, title: true, description: true },
      },
      lessons: {
        orderBy: { position: "asc" },
        // Its published lessons only, as the lesson page reads the path: a
        // draft or an archived lesson still linked here was a mission the map
        // offered and the lesson page answered with a 404, and one the path
        // could never be finished without.
        where: PUBLISHED_PATH_LESSON,
        include: {
          lesson: {
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              difficulty: true,
              estimatedMinutes: true,
              xpReward: true,
            },
          },
        },
      },
    },
  });

  if (!path) notFound();
  const [cover = builtInPathCover(path)] = await resolvePathCovers([path]);

  const cat = categoryMeta(path.category);
  const diff = difficultyMeta(path.difficulty);
  const trackLabel = path.track === "CAREER" ? "Métier" : "Compétence";

  // Fetch user's completed lessons for this path, among the missions drawn
  // below: one finished before it was archived is not one of them.
  const completedLessonIds = new Set(
    (
      await prisma.userLessonProgress.findMany({
        where: {
          userId: authUser.id,
          status: "COMPLETED",
          lesson: { status: "PUBLISHED", pathLessons: { some: { pathId: path.id } } },
        },
        select: { lessonId: true },
      })
    ).map((lp) => lp.lessonId),
  );

  const userPathProgress = await prisma.userPathProgress.upsert({
    where: { userId_pathId: { userId: authUser.id, pathId: path.id } },
    create: { userId: authUser.id, pathId: path.id, status: "IN_PROGRESS" },
    update: {},
    select: { status: true, certificateId: true, certificate: { select: { revokedAt: true } } },
  });

  const myRating = await ratingRepository.findUserPathRating(authUser.id, path.id);

  const xpTotal = path.lessons.reduce((sum, pl) => sum + pl.lesson.xpReward, 0);
  const doneLessons = completedLessonIds.size;
  const totalLessons = path.lessons.length;
  const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const lessonsComplete = totalLessons > 0 && doneLessons >= totalLessons;

  // Active quiz gates certificate issuance (pieces 2/4). Only its existence is
  // needed here; questions/answers never touch this server component.
  const activeQuiz = await prisma.quiz.findFirst({
    where: { pathId: path.id, isActive: true },
    select: { id: true },
  });

  // The same rule the catalogue and the lesson page apply, from the same
  // module. It used to live here alone, as a drawing of a rule nothing
  // enforced - two copies would have drifted the moment one of them changed.
  type NodeState = LockState;
  // The lessons the placement test waived open as completed ones would.
  const waivedLessonIds = new Set(
    await lessonRepository.findWaivedLessonIds(
      authUser.id,
      path.lessons.map((pl) => pl.lesson.id),
    ),
  );
  const placements = indexPlacements(
    [{ id: path.id, slug: path.slug, title: path.title, lessons: path.lessons }],
    completedLessonIds,
    { unlockAll: await unlocksEveryLesson(authUser.id), waivedLessonIds },
  );
  const nodeStates: NodeState[] = path.lessons.map(
    (pl) => placements.get(pl.lesson.id)?.state ?? "locked",
  );

  // The path's own modules when it has them, blocks of six otherwise. The
  // order of study is the lessons' position either way.
  const modules = groupIntoModules(path.lessons, path.modules);

  const pathStatus = userPathProgress.status;
  const pathCompleted = pathStatus === "COMPLETED";
  const hasQuiz = activeQuiz !== null;
  const hasCertConcept = path.certificateTemplate !== null;
  // A class path carries no certificate: the server refuses to claim or issue
  // one, so the page promises none, as the app's final card shows nothing.
  const certifiable = isCertifiablePath(path);
  // Revoked from the console: the path stays completed, the certificate does not.
  const certRevoked = userPathProgress.certificate?.revokedAt != null;
  // The certificate is "obtained" once it's been issued (same signal the final-boss
  // node uses for its download link), and until it is revoked. Drives the
  // MISSION.BRIEF certificate cell.
  const certObtained = userPathProgress.certificateId !== null && !certRevoked;

  // The lesson to pick up from, by the same rule that draws the map below. It
  // used to be the first lesson whatever the progress, so "Continuer" sent a
  // reader at mission 15 back to mission 1. A path with no lesson has nothing
  // to open, and shows no button rather than one that goes nowhere.
  const resumeSlug =
    resumeLesson(
      path.lessons,
      nodeStates,
      path.lessons.map((pl) => waivedLessonIds.has(pl.lesson.id)),
    )?.lesson.slug ?? null;
  const heroCtaLabel =
    pathCompleted || lessonsComplete
      ? "Revoir le parcours"
      : doneLessons > 0
        ? "Continuer le parcours"
        : "Commencer le parcours";

  // The final boss (certificate gate) shows whenever any current affordance would:
  // completed, lessons done (exam/claim), an active quiz, or a cert template.
  // Never on a class path: every one of its states leads to a certificate.
  const showBoss = certifiable && (lessonsComplete || pathCompleted || hasQuiz || hasCertConcept);

  return (
    <div className="page-container learning-catalogue learning-workspace path-workspace">
      <Crumb segments={[{ label: "parcours", href: "/paths" }, slug]} />
      <header className="path-hero">
        <div className="path-hero__copy">
          <p className="workspace-kicker">Ton itinéraire / {cat.short}</p>
          <div className="path-hero__meta">
            <span>{trackLabel}</span>
            <span>{diff.label}</span>
            {path.avgRating !== null && path.ratingsCount > 0 && (
              <span title={`Note moyenne des apprenants : ${formatAverage(path.avgRating)} sur 5`}>
                {averageLine(path.avgRating, path.ratingsCount)}
              </span>
            )}
          </div>
          <h1>
            {path.title}
            <span>.</span>
          </h1>
          <p className="path-hero__description">{path.description}</p>
          <a className="workspace-link" href="#path-curriculum">
            Voir les missions <span aria-hidden="true">↓</span>
          </a>
        </div>
        <CatalogueArtwork category={path.category} reference={path.refCode} coverSrc={cover} />
      </header>
      <section className="path-departure" aria-label="Ta progression dans ce parcours">
        <div className="path-departure__progress">
          <p>{pathCompleted ? "Parcours validé" : "Ta progression"}</p>
          <div className="path-departure__count">
            <strong>{doneLessons}</strong>
            <span>/ {totalLessons} missions terminées</span>
            <b>{pct} %</b>
          </div>
          <ProgressBar value={pct} size="md" color="#923200" label="Progression du parcours" />
          <div className="path-departure__actions">
            {resumeSlug !== null && (
              <Link className="btn" href={`/lessons/${resumeSlug}`}>
                {heroCtaLabel} <span aria-hidden="true">↗</span>
              </Link>
            )}
            <Link
              className="workspace-link"
              href={`/paths/${slug}/mock-exam`}
              title="Un entraînement chronométré : trois questions par module, le score par module, sans certificat ni XP"
            >
              Examen blanc
            </Link>
          </div>
        </div>
        <div className="brief__grid">
          <div className="brief__cell">
            <div className="lbl">Durée estimée</div>
            <div className="val">
              ~{path.estimatedHours}
              <span className="unit">h</span>
            </div>
          </div>
          <div className="brief__cell">
            <div className="lbl">XP des missions</div>
            <div className="val">{xpTotal.toLocaleString("fr-FR")}</div>
          </div>
          <BriefCertificate certifiable={certifiable} certObtained={certObtained} />
        </div>
      </section>
      <div className="path-body">
        <div id="path-curriculum" className="path-curriculum">
          <div className="workspace-section">
            <h2>Ton itinéraire.</h2>
            <span>
              {modules.length} module{modules.length > 1 ? "s" : ""} · {totalLessons} leçon
              {totalLessons > 1 ? "s" : ""}
            </span>
          </div>
          {modules.length === 0 && (
            <div className="path-empty">
              <h3>Les missions arrivent.</h3>
              <p>Ce parcours ne contient pas encore de leçon publiée.</p>
              <Link className="workspace-link" href="/paths">
                Choisir un autre parcours
              </Link>
            </div>
          )}
          <PathCurriculum
            pathSlug={slug}
            modules={modules}
            lessons={path.lessons}
            states={nodeStates}
            resumeSlug={resumeSlug}
          />
          <MockExamDialog slug={path.slug} pathTitle={path.title} />
          {showBoss && (
            <BossNode
              pathSlug={path.slug}
              pathTitle={path.title}
              hasQuiz={hasQuiz}
              lessonsComplete={lessonsComplete}
              pathCompleted={pathCompleted}
              certificateId={userPathProgress.certificateId}
              certificateRevoked={certRevoked}
              doneLessons={doneLessons}
              totalLessons={totalLessons}
            />
          )}
        </div>
        <StickyRail className="path-aside">
          <section className="ablock">
            <p className="ablock__eyebrow">À l’arrivée</p>
            <h2 className="ablock__title">Ce que tu vas maîtriser.</h2>
            <ul className="skill-list">
              {path.lessons.slice(0, 6).map((pl) => (
                <li key={pl.lesson.id}>{pl.lesson.description}</li>
              ))}
            </ul>
            {path.lessons.length === 0 && (
              <p>Les objectifs seront précisés avec les premières missions.</p>
            )}
          </section>
          <section className="ablock">
            <p className="ablock__eyebrow">Ton retour</p>
            <PathRating
              pathId={path.id}
              canRate={doneLessons > 0}
              initialScore={myRating?.score ?? null}
              initialFeedback={myRating?.feedback ?? null}
              avgRating={path.avgRating}
              ratingsCount={path.ratingsCount}
            />
          </section>
        </StickyRail>
      </div>
    </div>
  );
}
