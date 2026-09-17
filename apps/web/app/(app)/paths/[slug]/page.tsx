import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "./path-detail.css";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { indexPlacements, type LockState } from "@/lib/lessons/unlock";
import { requireUser } from "@cyberlearn/lib";
import { pathsVisibleTo, prisma } from "@cyberlearn/db";
import { BossNode } from "./_components/boss-node";

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = await prisma.path.findUnique({ where: { slug }, select: { title: true } });
  return { title: path?.title ?? "Parcours" };
}

// ── Design meta maps ────────────────────────────────────────────────────────────

const CAT_META: Record<string, { label: string; color: string; tagClass: string }> = {
  CYBERSEC: { label: "Cybersec", color: "#FF4757", tagClass: "cyber" },
  DEV: { label: "Dev", color: "#6E8BFF", tagClass: "dev" },
  NETWORK: { label: "Réseau", color: "#0AFFD4", tagClass: "net" },
};

const DIFF_META: Record<
  string,
  { label: string; level: number; color: string; abbr: "beg" | "int" | "adv" | "exp" }
> = {
  BEGINNER: { label: "Débutant", level: 1, color: "var(--cosmetic-accent)", abbr: "beg" },
  INTERMEDIATE: { label: "Intermédiaire", level: 2, color: "#6E8BFF", abbr: "int" },
  ADVANCED: { label: "Avancé", level: 3, color: "#FF4757", abbr: "adv" },
  EXPERT: { label: "Expert", level: 3, color: "#FFB020", abbr: "exp" },
};

const CAT_DEFAULT = { label: "?", color: "#B8B5D1", tagClass: "cyber" };
const DIFF_DEFAULT = { label: "?", level: 1, color: "#B8B5D1", abbr: "beg" as const };

// ── Shared markup ───────────────────────────────────────────────────────────────

function Brackets(): React.JSX.Element {
  return (
    <>
      <span className="bk tl" />
      <span className="bk tr" />
      <span className="bk bl" />
      <span className="bk br" />
    </>
  );
}

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
function MissionCard({
  lesson,
  state,
  num,
}: {
  lesson: CardLesson;
  state: CardState;
  num: string;
}): React.JSX.Element {
  const ld = DIFF_META[lesson.difficulty] ?? DIFF_DEFAULT;
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
        <span className={`diff diff--${ld.abbr}`}>{ld.label}</span>
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
}: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const authUser = await requireUser(supabase);

  const path = await prisma.path.findFirst({
    // Not findUnique on the slug: a CLASS path is published, so the reader is
    // part of the question. findUnique takes only unique fields, which is how
    // the entitlement would have been left out.
    where: { slug, ...pathsVisibleTo(authUser.id) },
    include: {
      lessons: {
        orderBy: { position: "asc" },
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

  const cat = CAT_META[path.category] ?? CAT_DEFAULT;
  const diff = DIFF_META[path.difficulty] ?? DIFF_DEFAULT;
  const trackLabel = path.track === "CAREER" ? "Métier" : "Compétence";

  // Fetch user's completed lessons for this path
  const completedLessonIds = new Set(
    (
      await prisma.userLessonProgress.findMany({
        where: {
          userId: authUser.id,
          status: "COMPLETED",
          lesson: { pathLessons: { some: { pathId: path.id } } },
        },
        select: { lessonId: true },
      })
    ).map((lp) => lp.lessonId),
  );

  const userPathProgress = await prisma.userPathProgress.upsert({
    where: { userId_pathId: { userId: authUser.id, pathId: path.id } },
    create: { userId: authUser.id, pathId: path.id, status: "IN_PROGRESS" },
    update: {},
    select: { status: true, certificateId: true },
  });

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
  const placements = indexPlacements(
    [{ id: path.id, slug: path.slug, title: path.title, lessons: path.lessons }],
    completedLessonIds,
  );
  const nodeStates: NodeState[] = path.lessons.map(
    (pl) => placements.get(pl.lesson.id)?.state ?? "locked",
  );

  // Group lessons into modules (every 6 lessons)
  const MODULE_SIZE = 6;
  const modules: { label: string; start: number; end: number }[] = [];
  for (let i = 0; i < totalLessons; i += MODULE_SIZE) {
    const moduleNum = modules.length + 1;
    modules.push({
      label: `Module ${String(moduleNum).padStart(2, "0")}`,
      start: i,
      end: Math.min(i + MODULE_SIZE, totalLessons),
    });
  }

  const pathStatus = userPathProgress.status;
  const pathCompleted = pathStatus === "COMPLETED";
  const hasQuiz = activeQuiz !== null;
  const hasCertConcept = path.certificateTemplate !== null;
  // The certificate is "obtained" once it's been issued (same signal the final-boss
  // node uses for its download link). Drives the MISSION.BRIEF certificate cell.
  const certObtained = userPathProgress.certificateId !== null;

  // serpentine state → card visual state
  const cardState = (s: NodeState): CardState =>
    s === "completed" ? "done" : s === "unlocked" ? "active" : "locked";

  const firstLessonSlug = path.lessons[0]?.lesson.slug;
  const heroCtaLabel =
    pathStatus === "IN_PROGRESS"
      ? "Continuer le parcours"
      : pathStatus === "COMPLETED"
        ? "Revoir le parcours"
        : "Commencer le parcours";

  // The final boss (certificate gate) shows whenever any current affordance would:
  // completed, lessons done (exam/claim), an active quiz, or a cert template.
  const showBoss = lessonsComplete || pathCompleted || hasQuiz || hasCertConcept;

  return (
    <div className="pd2">
      {/* breadcrumb */}
      <div className="pd2-crumb">
        <span className="p">$</span>
        <span>~/</span>
        <b>cyberlearn</b>
        <span className="slash">/</span>
        <Link href="/paths">parcours</Link>
        <span className="slash">/</span>
        <span className="current">{slug}</span>
        <span className="caret" />
      </div>

      {/* hero */}
      <section className="pd2-hero">
        <div>
          <div className="pd2-hero__tags">
            <span className={`pd2-tag pd2-tag--${cat.tagClass}`}>
              <span className="dom-dot" />
              {cat.label}
            </span>
            <span className="pd2-tag pd2-tag--track">{trackLabel}</span>
            <span className="pd2-tag pd2-tag--diff">
              <span className={`diff-bars lv${String(diff.level)}`}>
                <span />
                <span />
                <span />
              </span>{" "}
              {diff.label}
            </span>
          </div>
          <h1 className="pd2-title">{path.title}</h1>
          <p className="pd2-desc">{path.description}</p>
        </div>

        <div className="brief">
          <Brackets />
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
            <div className="brief__cell brief__cell--cert">
              {certObtained ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 10.5 L8.5 15 L16 6" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="10" cy="8" r="4" />
                  <path d="M7 11.5 L6 17 L10 15 L14 17 L13 11.5" />
                </svg>
              )}
              <span>
                Certificat
                <br />
                {certObtained ? "disponible" : "inclus"}
              </span>
            </div>
          </div>
          <Link href={firstLessonSlug ? `/lessons/${firstLessonSlug}` : "#"} className="brief__cta">
            {heroCtaLabel} {ARROW}
          </Link>
        </div>
      </section>

      {/* Progress bar */}
      <div className="pd2-prog">
        <div className="pd2-prog__label">
          <b>{pct}%</b> complété
        </div>
        <div className="pd2-prog__bar">
          {pct > 0 && <div className="pd2-prog__fill" style={{ width: `${String(pct)}%` }} />}
        </div>
        <div className="pd2-prog__count">
          <b>{doneLessons}</b> / {totalLessons} missions
        </div>
      </div>

      {/* body */}
      <div className="pd2-body">
        <div className="cpath">
          {modules.map((mod) => {
            const moduleLessons = path.lessons.slice(mod.start, mod.end);
            const gateDone = moduleLessons.some((_, j) => {
              const s = nodeStates[mod.start + j];
              return s === "completed" || s === "unlocked";
            });
            return (
              <React.Fragment key={mod.label}>
                <div className={`cp-gate${gateDone ? " cp-gate--done" : ""}`}>
                  <div className="cp-gate__side cp-gate__side--l">
                    <span className="cp-gate__rule" />
                    <span className="cp-gate__label">
                      <span className="mod">{mod.label.toUpperCase()}</span>
                    </span>
                  </div>
                  <div className="cp-mid">
                    <span className="cp-gate__marker" />
                  </div>
                  <div className="cp-gate__side">
                    <span className="cp-gate__count">
                      <b>{mod.end - mod.start}</b> missions
                    </span>
                    <span className="cp-gate__rule" />
                  </div>
                </div>
                {moduleLessons.map((pl, j) => {
                  const globalIdx = mod.start + j;
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
                        <MissionCard lesson={lesson} state={st} num={num} />
                      ) : (
                        <div className="cp-cell cp-cell--empty" />
                      )}
                      <div className="cp-mid">
                        <span className="cp-node">
                          <NodeContent state={st} num={num} />
                        </span>
                      </div>
                      {side === "is-right" ? (
                        <MissionCard lesson={lesson} state={st} num={num} />
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
              doneLessons={doneLessons}
              totalLessons={totalLessons}
            />
          )}
        </div>

        {/* aside */}
        <aside className="pd2-aside">
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
        </aside>
      </div>
    </div>
  );
}
