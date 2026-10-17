import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, RotateCcw } from "lucide-react";
import "./path-detail.css";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { indexPlacements, type LockState, resumeLesson } from "@cyberlearn/lib/paths/unlock";
import { unlocksEveryLesson } from "@/lib/lessons/access";
import { requireUser } from "@cyberlearn/lib";
import { groupIntoModules, moduleLabel } from "@cyberlearn/lib/paths/modules";
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
import { Brackets } from "@/app/_components/corner-brackets";
import { Crumb } from "@/components/crumb";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { averageLine, formatAverage } from "@cyberlearn/lib/content/rating";
import { barsOf, DiffBars } from "@/app/_components/path-catalog-card";
import { ProgressBar } from "@/components/progress-bar";
import { StickyRail } from "@/components/sticky-rail";
import { RappelButton } from "@/components/rappel/rappel-button";
import { moduleRappelValue } from "@/components/rappel/rappel-query";
import { builtInPathCover, resolvePathCovers } from "@/lib/paths/cover";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: (await visiblePathTitle(slug)) ?? "Parcours" };
}

// ── Design meta maps ────────────────────────────────────────────────────────────

/** The stylesheet's names: the category on the hero tag, the difficulty on a lesson's. */
const TAG_CLASS: Record<string, string> = { CYBERSEC: "cyber", DEV: "dev", NETWORK: "net" };
const DIFF_ABBR: Record<string, string> = {
  BEGINNER: "beg",
  INTERMEDIATE: "int",
  ADVANCED: "adv",
  EXPERT: "exp",
};

// ── Shared markup ───────────────────────────────────────────────────────────────

const ARROW = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8 H13 M9 4 L13 8 L9 12" />
  </svg>
);

type CardState = "done" | "active" | "locked";

interface CardLesson {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  xpReward: number;
  estimatedMinutes: number;
}

/** One mission card on the serpentine path. Done = whole card links to the
 *  lesson; active = card is static with an inner "Accéder" CTA link; locked =
 *  static, non-clickable. */
function PathLessonCard({
  lesson,
  state,
  num,
}: {
  lesson: CardLesson;
  state: CardState;
  num: string;
}): React.JSX.Element {
  const ld = difficultyMeta(lesson.difficulty);
  const abbr = DIFF_ABBR[lesson.difficulty] ?? "beg";
  const inner = (
    <>
      {state === "active" && <Brackets />}
      <span className="cp-card__leader" />
      <div className="cp-card__head">
        <span className="cp-card__mn">
          MISSION · <b>{num}</b>
        </span>
        {state === "done" && <span className="cp-statepill cp-statepill--done">Complété</span>}
        {state === "active" && (
          <span className="cp-statepill cp-statepill--active">
            <span className="pulse-dot" />
            En cours
          </span>
        )}
        {state === "locked" && (
          <span className="cp-statepill cp-statepill--locked">Verrouillé</span>
        )}
      </div>
      <h3 className="cp-card__title">{lesson.title}</h3>
      <div className="cp-card__meta">
        <span className={`diff diff--${abbr}`}>{ld.label}</span>
        <span className="xp">+{lesson.xpReward} XP</span>
        <span className="sep">·</span>
        <span>{lesson.estimatedMinutes} min</span>
      </div>
      {state === "done" && <div className="cp-card__action">↺ Revoir la mission</div>}
      {state === "active" && (
        <Link href={`/lessons/${lesson.slug}`} className="cp-card__cta">
          Accéder {ARROW}
        </Link>
      )}
      {state === "locked" && (
        <div className="cp-card__action">🔒 Complète la mission précédente</div>
      )}
    </>
  );

  return (
    <div className="cp-cell cp-cell--card">
      {state === "done" ? (
        <Link href={`/lessons/${lesson.slug}`} className="cp-card">
          {inner}
        </Link>
      ) : (
        <div className="cp-card">{inner}</div>
      )}
    </div>
  );
}

function NodeContent({ state, num }: { state: CardState; num: string }): React.JSX.Element {
  if (state === "done") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8 L7 12 L13 4" />
      </svg>
    );
  }
  if (state === "locked") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
        <path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7" />
      </svg>
    );
  }
  return (
    <>
      <span className="cp-node__ring" />
      <span className="cp-node__n">{num}</span>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
  const tagClass = TAG_CLASS[path.category] ?? "cyber";
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

  // serpentine state → card visual state
  const cardState = (s: NodeState): CardState =>
    s === "completed" ? "done" : s === "unlocked" ? "active" : "locked";

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
    <div className="pd2">
      {/* breadcrumb */}
      <Crumb segments={[{ label: "parcours", href: "/paths" }, slug]} />

      {/* hero */}
      <section className="pd2-hero">
        <div>
          <div className="pd2-hero__tags">
            <span className={`pd2-tag pd2-tag--${tagClass}`}>
              <span className="dom-dot" />
              {cat.short}
            </span>
            <span className="pd2-tag pd2-tag--track">{trackLabel}</span>
            {path.avgRating !== null && path.ratingsCount > 0 && (
              <span
                className="pd2-tag"
                title={`Note moyenne des apprenants : ${formatAverage(path.avgRating)} sur 5`}
              >
                <span aria-hidden="true" style={{ color: "var(--color-warning)" }}>
                  ★
                </span>{" "}
                {averageLine(path.avgRating, path.ratingsCount)}
              </span>
            )}
            <span className="pd2-tag pd2-tag--diff">
              <DiffBars level={barsOf(diff.level)} /> {diff.label}
            </span>
          </div>
          <h1 className="pd2-title gradient-title">{path.title}</h1>
          <p className="pd2-desc">{path.description}</p>
        </div>

        <div className="brief">
          <Brackets />
          {/* The path's cover (lib/paths/cover.ts), above what it asks of you. */}
          <div
            className="brief__cover"
            aria-hidden="true"
            style={{ backgroundImage: `url("${cover}")` }}
          />
          <div className="brief__eyebrow">{"// MISSION.BRIEF"}</div>
          <div className="brief__grid">
            <div className="brief__cell">
              <div className="lbl">Missions</div>
              <div className="val">{totalLessons}</div>
            </div>
            <div className="brief__cell">
              <div className="lbl">Durée estimée</div>
              <div className="val">
                ~{path.estimatedHours}
                <span className="unit">h</span>
              </div>
            </div>
            <div className="brief__cell brief__cell--xp">
              <div className="lbl">XP total</div>
              <div className="val">{xpTotal.toLocaleString("fr-FR")}</div>
            </div>
            <BriefCertificate certifiable={certifiable} certObtained={certObtained} />
          </div>
          {resumeSlug !== null && (
            <Link href={`/lessons/${resumeSlug}`} className="brief__cta">
              {heroCtaLabel} {ARROW}
            </Link>
          )}
          {/* The mock exam's presentation, in a window over the path (?mock=1). */}
          <MockExamDialog slug={path.slug} pathTitle={path.title} />
        </div>
      </section>

      {/* Progress bar */}
      <div className="pd2-prog">
        <div className="pd2-prog__label">
          <b>{pct}%</b> complété
        </div>
        <ProgressBar
          value={pct}
          size="lg"
          tip
          className="pd2-prog__bar"
          label="Progression du parcours"
        />
        <div className="pd2-prog__count">
          <b>{doneLessons}</b> / {totalLessons} missions
        </div>
      </div>

      {/* body */}
      <div className="pd2-body">
        <div className="cpath">
          {modules.map((mod) => {
            const gateDone = mod.indices.some((index) => {
              const s = nodeStates[index];
              return s === "completed" || s === "unlocked";
            });
            // Its review asks about the lessons finished: none, nothing to offer.
            const reviewable = mod.indices.some((index) => {
              const id = path.lessons[index]?.lesson.id;
              return id !== undefined && completedLessonIds.has(id);
            });
            return (
              <React.Fragment key={mod.key}>
                <div className={`cp-gate${gateDone ? " cp-gate--done" : ""}`}>
                  <div className="cp-gate__side cp-gate__side--l">
                    <span className="cp-gate__rule" />
                    <span className="cp-gate__label" title={mod.description ?? undefined}>
                      <span className="mod">{moduleLabel(mod).toUpperCase()}</span>
                      {mod.title !== null ? <span className="nm">{mod.title}</span> : null}
                    </span>
                  </div>
                  <div className="cp-mid">
                    <span className="cp-gate__marker" />
                  </div>
                  <div className="cp-gate__side">
                    <a
                      className="btn btn--ghost btn--sm"
                      href={`/api/paths/${slug}/sheet?module=${String(mod.number)}`}
                      download
                      title="La fiche de révision du module, les points à retenir de ses leçons, en PDF"
                    >
                      <FileDown size={14} strokeWidth={1.75} aria-hidden="true" />
                      Fiche PDF
                    </a>
                    {reviewable && (
                      <RappelButton
                        value={moduleRappelValue(path.slug, mod.number)}
                        className="btn btn--ghost btn--sm"
                        title="Quelques questions des leçons faites de ce module, corrigées une à une, sans XP"
                      >
                        <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
                        Réviser ce module · 2 min
                      </RappelButton>
                    )}
                    <span className="cp-gate__count">
                      <b>{mod.indices.length}</b> missions
                    </span>
                    <span className="cp-gate__rule" />
                  </div>
                </div>
                {mod.indices.map((globalIdx) => {
                  const pl = path.lessons[globalIdx];
                  if (!pl) return null;
                  const st = cardState(nodeStates[globalIdx] ?? "locked");
                  const side = globalIdx % 2 === 0 ? "is-left" : "is-right";
                  const num = String(globalIdx + 1).padStart(2, "0");
                  const lesson = pl.lesson;
                  return (
                    <div
                      key={lesson.id}
                      className={`cp-row cp-row--${st} ${side}${globalIdx === 0 ? " cp-row--first" : ""}`}
                    >
                      {side === "is-left" ? (
                        <PathLessonCard lesson={lesson} state={st} num={num} />
                      ) : (
                        <div className="cp-cell cp-cell--empty" />
                      )}
                      <div className="cp-mid">
                        <span className="cp-node">
                          <NodeContent state={st} num={num} />
                        </span>
                      </div>
                      {side === "is-right" ? (
                        <PathLessonCard lesson={lesson} state={st} num={num} />
                      ) : (
                        <div className="cp-cell cp-cell--empty" />
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

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

        {/* aside */}
        <StickyRail className="pd2-aside">
          <div className="ablock">
            <div className="ablock__eyebrow">
              - <b>01</b> · OBJECTIFS
            </div>
            <h3 className="ablock__title">Ce que tu vas maîtriser</h3>
            <ul className="skill-list">
              {path.lessons.slice(0, 6).map((pl) => (
                <li key={pl.lesson.id}>{pl.lesson.description}</li>
              ))}
            </ul>
          </div>
          <div className="ablock">
            <div className="ablock__eyebrow">
              - <b>02</b> · TON AVIS
            </div>
            <PathRating
              pathId={path.id}
              canRate={doneLessons > 0}
              initialScore={myRating?.score ?? null}
              initialFeedback={myRating?.feedback ?? null}
              avgRating={path.avgRating}
              ratingsCount={path.ratingsCount}
            />
          </div>
        </StickyRail>
      </div>
    </div>
  );
}
