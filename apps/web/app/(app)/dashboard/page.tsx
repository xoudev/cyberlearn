import React, { Suspense } from "react";
import Link from "next/link";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { XpHeroCard } from "./_components/xp-hero-card";
import { WelcomeModal } from "./_components/welcome-modal";
import { computeLevel } from "@cyberlearn/lib";
import { rankFeaturedPaths } from "@cyberlearn/lib/dashboard/featured-paths";
import { lessonOutline } from "@cyberlearn/lib/dashboard/lesson-outline";
import { nextRankName, rankName } from "@cyberlearn/lib/dashboard/rank-name";
import { planSections, sectionNumber } from "@cyberlearn/lib/dashboard/sections";
import { dashboardStats } from "@cyberlearn/lib/dashboard/stats";
import {
  BadgeMedallion,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  toBadgeRarity,
} from "@cyberlearn/ui";
import { CATALOGUE_PATH, leaderboardRepository, pathsVisibleTo, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import { StreakPanel } from "@/components/streak-panel";
import { QuestsPanel } from "@/components/quests-panel";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage(): React.ReactElement {
  return (
    <>
      <WelcomeModal />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

async function DashboardContent(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const now = new Date();
  /** Midnight on the first of the current month, local time - "ce mois-ci". */
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    dbUser,
    inProgressRows,
    dueReviews,
    completedTotal,
    inProgressTotal,
    badgeRows,
    badgeTotal,
    badgesThisMonth,
    completedThisMonth,
    certificateCount,
    certifiablePaths,
    userRank,
    allPaths,
    placementResult,
    recentLessons,
    wantsRevisions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { displayName: true, xpTotal: true, streakDays: true, longestStreak: true },
    }),
    prisma.userLessonProgress.findMany({
      where: { userId: authUser.id, status: "IN_PROGRESS" },
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
            category: true,
            estimatedMinutes: true,
            xpReward: true,
            // The card previews this lesson's own outline and summary.
            description: true,
            contentMdx: true,
          },
        },
      },
      orderBy: { lastAccessedAt: "desc" },
      take: 1,
    }),
    prisma.reviewSchedule.findMany({
      where: { userId: authUser.id, nextReviewAt: { lte: now } },
      orderBy: { nextReviewAt: "asc" },
      take: 3,
      include: {
        lesson: {
          select: {
            slug: true,
            title: true,
            difficulty: true,
            category: true,
            estimatedMinutes: true,
          },
        },
      },
    }),
    prisma.userLessonProgress.count({
      where: { userId: authUser.id, status: "COMPLETED" },
    }),
    // The strip said "N en cours" from the length of a list fetched with
    // take: 1, so it could only ever say 0 or 1 however many were open.
    prisma.userLessonProgress.count({
      where: { userId: authUser.id, status: "IN_PROGRESS" },
    }),
    prisma.userBadge.findMany({
      where: { userId: authUser.id },
      include: {
        badge: { select: { name: true, description: true, rarity: true, iconUrl: true } },
      },
      orderBy: { earnedAt: "desc" },
      take: 3,
    }),
    // The shelf shows three. The collection link and the figure below used to
    // count that shelf, so somebody with twenty-seven badges was told they had
    // three.
    prisma.userBadge.count({ where: { userId: authUser.id } }),
    prisma.userBadge.count({ where: { userId: authUser.id, earnedAt: { gte: monthStart } } }),
    prisma.userLessonProgress.count({
      where: { userId: authUser.id, status: "COMPLETED", completedAt: { gte: monthStart } },
    }),
    // "CERTIFICATS · 0 · sur 4 disponibles" was a literal zero and a literal
    // four, on every account, for everybody.
    prisma.certificate.count({ where: { userId: authUser.id, revokedAt: null } }),
    // The denominator is the catalogue, because that is what issues
    // certificates: checkAndIssueCertificates walks the catalogue paths a
    // finished lesson belongs to. A class's own path is not one of them.
    prisma.path.count({ where: CATALOGUE_PATH }),
    leaderboardRepository.findUserRank(authUser.id),
    // Not { status: "PUBLISHED" }. A path a teacher builds for their class is
    // published - the class has to be able to open it - so that filter
    // recommended one class's private work to the whole site. pathsVisibleTo is
    // the rule the catalogue and the slug lookup read: the catalogue, plus the
    // paths built for the classes this reader is in or teaches.
    prisma.path.findMany({
      where: pathsVisibleTo(authUser.id),
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedHours: true,
        _count: { select: { lessons: true, progress: { where: { status: "COMPLETED" } } } },
        progress: {
          where: { userId: authUser.id },
          select: { status: true },
          take: 1,
        },
      },
    }),
    prisma.userPlacementResult.findUnique({
      where: { userId: authUser.id },
      select: { devScore: true, cybersecScore: true, networkScore: true },
    }),
    prisma.userLessonProgress.findMany({
      where: { userId: authUser.id, status: "COMPLETED" },
      select: { lesson: { select: { category: true } } },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    revisionsEnabled(authUser.id),
  ]);

  const { level, current, needed } = computeLevel(dbUser?.xpTotal ?? 0);
  const xpPercent = needed > 0 ? Math.min((current / needed) * 100, 100) : 0;
  const xpNeededToNext = Math.max(needed - current, 0);
  const firstName = (dbUser?.displayName ?? "Opérateur").split(" ")[0] ?? "Opérateur";
  const streakDays = dbUser?.streakDays ?? 0;
  const completedCount = completedTotal;
  const rank = rankName(level);
  const nextRank = nextRankName(level);

  // ── Path recommendation: the same ranking as the app's home tab ──────────
  const featuredPaths: FeaturedPath[] = rankFeaturedPaths(
    allPaths.map((p) => ({ ...p, status: p.progress[0]?.status ?? null })),
    {
      level,
      placement: placementResult
        ? {
            DEV: placementResult.devScore,
            CYBERSEC: placementResult.cybersecScore,
            NETWORK: placementResult.networkScore,
          }
        : null,
      recentCategories: recentLessons.map((row) => row.lesson.category),
    },
  ).map((path) => ({
    id: path.id,
    slug: path.slug,
    title: path.title,
    description: path.description,
    category: path.category,
    difficulty: path.difficulty,
    estimatedHours: path.estimatedHours,
    _count: { lessons: path._count.lessons, progress: path._count.progress },
  }));

  const resumeLesson = inProgressRows[0];

  // What turns the lead section from a poster into a place to start: how far
  // into the featured path this reader already is, and which lesson is next.
  // Only for the one path that leads - the alternative beside it is an offer,
  // not a task.
  const lead = featuredPaths[0];
  let leadProgress: PathProgress | null = null;
  if (lead) {
    const [doneInPath, nextStep] = await Promise.all([
      prisma.userLessonProgress.count({
        where: {
          userId: authUser.id,
          status: "COMPLETED",
          lesson: { pathLessons: { some: { pathId: lead.id } } },
        },
      }),
      prisma.pathLesson.findFirst({
        where: {
          pathId: lead.id,
          lesson: { progress: { none: { userId: authUser.id, status: "COMPLETED" } } },
        },
        orderBy: { position: "asc" },
        select: {
          position: true,
          lesson: { select: { slug: true, title: true, estimatedMinutes: true } },
        },
      }),
    ]);
    leadProgress = {
      completed: doneInPath,
      total: lead._count.lessons,
      next: nextStep
        ? {
            position: nextStep.position,
            slug: nextStep.lesson.slug,
            title: nextStep.lesson.title,
            estimatedMinutes: nextStep.lesson.estimatedMinutes,
          }
        : null,
    };
  }

  const sections = planSections({
    hasResume: resumeLesson !== undefined,
    dueReviews: wantsRevisions ? dueReviews.length : 0,
  });

  // Stable session indicator from last chars of user UUID
  const sessionId = authUser.id.slice(-4).toUpperCase();
  const dateStr = now
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  return (
    <div className="page-container">
      {/* ── Status strip ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "#7F7BA9",
          letterSpacing: "0.06em",
          marginBottom: 32,
          textTransform: "uppercase",
          flexWrap: "wrap",
        }}
      >
        <span>
          SESSION · <b style={{ color: "var(--cosmetic-accent)" }}>#{sessionId}</b>
        </span>
        <span style={{ color: "#44406B" }}>/</span>
        <span>{dateStr}</span>
        <span style={{ color: "#44406B" }}>/</span>
        <StatusLive />
        <span style={{ color: "#44406B" }}>/</span>
        <span>
          {completedCount} leçons vues · {inProgressTotal} en cours
        </span>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="animate-fade-up dash-hero-grid">
        {/* Left: greeting */}
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7F7BA9",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 32,
                height: 1,
                background: "var(--cosmetic-accent)",
                display: "inline-block",
              }}
            />
            Bon retour
          </div>

          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(36px, 9vw, 96px)",
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
              margin: 0,
            }}
          >
            Bonjour,
            <br />
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(135deg, #0024FF 0%, var(--cosmetic-accent) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {firstName}.
            </em>
          </h1>

          <p
            style={{
              margin: "28px 0 0",
              fontFamily: "var(--font-body)",
              fontSize: 17,
              color: "#B8B5D1",
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            Tu reprends là où tu t&apos;es arrêté.
            {streakDays > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 8,
                  padding: "6px 14px 6px 12px",
                  background:
                    "linear-gradient(135deg, rgba(255,71,87,0.14), rgba(255,181,71,0.18))",
                  border: "1px solid rgba(255,181,71,0.4)",
                  color: "#F5F5FA",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
                }}
              >
                <span style={{ fontSize: 16 }}>🔥</span>
                <span style={{ fontSize: 20, color: "#FFB547", letterSpacing: "-0.02em" }}>
                  {streakDays}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#B8B5D1",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {streakDays > 1 ? "jours" : "jour"}
                </span>
              </span>
            )}
          </p>
        </div>

        {/* Right: XP hero card */}
        <XpHeroCard
          level={level}
          rankName={rank}
          nextRank={nextRank}
          xpCurrent={current}
          xpNeeded={needed}
          xpPercent={xpPercent}
          xpNeededToNext={xpNeededToNext}
          userRank={userRank}
        />
      </section>

      {/* ── Parcours: the lead ───────────────────────────────────────────── */}
      <section className="animate-fade-up s-section">
        <SectionLabel
          eyebrow={`${sectionNumber(sections, "paths") ?? "01"} · parcours`}
          title={
            leadProgress && leadProgress.completed > 0
              ? "Reprends ton parcours."
              : "Ta prochaine mission."
          }
          ctaLabel="Tous les parcours →"
          ctaHref="/paths"
        />
        <PathsGrid paths={featuredPaths} leadProgress={leadProgress} />
      </section>

      {/* ── En cours: the half-finished lesson, when there is one ─────────── */}
      {resumeLesson && (
        <section className="animate-fade-up-delay-1 s-section">
          <SectionLabel
            eyebrow={`${sectionNumber(sections, "resume") ?? "02"} · en cours`}
            title="Reprends l'exploit."
            ctaLabel="Historique complet →"
            ctaHref="/lessons"
          />
          <TerminalCard
            lesson={resumeLesson.lesson}
            outline={lessonOutline(resumeLesson.lesson.contentMdx, 50)}
          />
        </section>
      )}

      {/* ── À réviser: only when something is actually due ────────────────── */}
      {wantsRevisions && dueReviews.length > 0 && (
        <section className="animate-fade-up-delay-2 s-section">
          <SectionLabel
            eyebrow={`${sectionNumber(sections, "reviews") ?? "03"} · à réviser`}
            title={`${String(dueReviews.length)} leçon${dueReviews.length > 1 ? "s" : ""} demande${dueReviews.length > 1 ? "nt" : ""} ton attention.`}
            ctaLabel="Tout réviser →"
            ctaHref="/revisions"
          />
          <ReviewsBlock rows={dueReviews} />
        </section>
      )}

      {/* ── Progression: one band, not four stacked sections ──────────────── */}
      <section className="animate-fade-up-delay-3 s-section">
        <SectionLabel
          eyebrow={`${sectionNumber(sections, "progress") ?? "04"} · progression`}
          title="Où tu en es."
          ctaLabel={`Collection · ${String(badgeTotal)} →`}
          ctaHref="/badges"
        />

        <StatsBig
          completedThisMonth={completedThisMonth}
          completedTotal={completedCount}
          streakDays={streakDays}
          longestStreak={dbUser?.longestStreak ?? 0}
          badgesThisMonth={badgesThisMonth}
          badgeTotal={badgeTotal}
          certificateCount={certificateCount}
          certifiablePaths={certifiablePaths}
        />

        {/* Quests and the streak calendar used to be sections 05 and 06, one
            under the other, each with its own numbered heading. They are two
            views of the same week, so they sit side by side under one. */}
        <div className="dash-progress-pair">
          <QuestsPanel userId={authUser.id} />
          <StreakPanel userId={authUser.id} />
        </div>

        {badgeRows.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <TrophyShelf badges={badgeRows} />
          </div>
        )}
      </section>
    </div>
  );
}

// ── Status strip live indicator (client not needed: pure CSS animation) ───────

function StatusLive() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--cosmetic-accent)",
      }}
    >
      <span
        className="status-live-dot"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--cosmetic-accent)",
          boxShadow: "0 0 6px var(--cosmetic-accent)",
          animation: "sidebar-pulse 2s ease-in-out infinite",
          display: "inline-block",
        }}
      />
      SYNC EN DIRECT
    </span>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({
  eyebrow,
  title,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  title: string;
  ctaLabel?: string | undefined;
  ctaHref?: string | undefined;
}) {
  return (
    <div className="section-label-header">
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7F7BA9",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ width: 24, height: 1, background: "#3D3785", display: "inline-block" }} />
          {eyebrow}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "clamp(24px, 4.5vw, 44px)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: "#F5F5FA",
            margin: "8px 0 0",
          }}
        >
          {title}
        </h2>
      </div>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="link-cta"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#B8B5D1",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #2A2560",
            paddingBottom: 4,
          }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

// ── Terminal resume card ───────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  CYBERSEC: "#FF4757",
  DEV: "#6E8BFF",
  NETWORK: "#0AFFD4",
};

const DIFF_LABELS: Record<string, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

function TerminalCard({
  lesson,
  outline,
}: {
  lesson: {
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    estimatedMinutes: number;
    xpReward: number;
    description: string;
  };
  /** The lesson's own section titles (lessonOutline); empty falls back. */
  outline: string[];
}) {
  const catColor = CAT_COLORS[lesson.category] ?? "#6E8BFF";
  const diffLabel = DIFF_LABELS[lesson.difficulty] ?? lesson.difficulty;
  // Every line comes from the lesson being resumed. The card once showed the
  // same SQL-injection query and "next section: defences" for every lesson,
  // so a cryptography lesson was previewed with another lesson's code.
  const comment = (text: string): React.ReactNode => (
    <span style={{ color: "#7F7BA9", fontStyle: "italic" }}># {text}</span>
  );
  const codeLines: React.ReactNode[] = [
    comment(lesson.title),
    <span key="def">
      <span style={{ color: "#6E8BFF" }}>def</span>{" "}
      <span style={{ color: "#F5F5FA", fontWeight: 500 }}>continuer</span>
      <span style={{ color: "#7F7BA9" }}>(session):</span>
    </span>,
    <span key="ret">
      {" "}
      <span style={{ color: "#6E8BFF" }}>return</span> session
      <span style={{ color: "#7F7BA9" }}>.</span>
      <span style={{ color: "#F5F5FA", fontWeight: 500 }}>reprendre</span>
      <span style={{ color: "#7F7BA9" }}>(</span>
      <span style={{ color: "var(--cosmetic-accent)" }}>&quot;{lesson.slug}&quot;</span>
      <span style={{ color: "#7F7BA9" }}>)</span>
    </span>,
    <span key="blank" />,
    ...(outline.length > 0
      ? [
          comment("Au programme"),
          ...outline.slice(0, 4).map((title) => comment(`· ${title}`)),
          ...(outline.length > 4 ? [comment(`· … et ${String(outline.length - 4)} de plus`)] : []),
        ]
      : [comment(`${String(lesson.estimatedMinutes)} min · +${String(lesson.xpReward)} XP`)]),
  ];

  return (
    <div className="terminal-card-grid">
      {/* Code panel */}
      <div
        className="terminal-code-panel"
        style={{
          position: "relative",
          padding: "20px 28px 28px",
          // base surface follows the equipped terminal-theme cosmetic
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--cosmetic-accent) 4%, transparent), transparent 40%), var(--cosmetic-terminal-bg)",
          overflow: "hidden",
        }}
      >
        {/* Chrome: colored dots + path + LIVE badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: "1px solid #2A2560",
            position: "relative",
            zIndex: 1,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#FF4757",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#FFB547",
              display: "inline-block",
            }}
          />
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--cosmetic-accent)",
              boxShadow: "0 0 8px color-mix(in srgb, var(--cosmetic-accent) 50%, transparent)",
              display: "inline-block",
            }}
          />
          <span
            style={{
              marginLeft: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.04em",
            }}
          >
            ~/cyberlearn/<b style={{ color: "#B8B5D1", fontWeight: 500 }}>{lesson.slug}.py</b>
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#FF4757",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "currentColor",
                boxShadow: "0 0 6px currentColor",
                display: "inline-block",
              }}
            />
            LIVE
          </span>
        </div>

        {/* Code body */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.75,
            color: "#B8B5D1",
          }}
        >
          {[
            ...codeLines,
            <span key="cursor">
              &gt;{" "}
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 14,
                  background: "var(--cosmetic-accent)",
                  boxShadow: "0 0 8px var(--cosmetic-accent)",
                  verticalAlign: "-2px",
                  animation: "blink 1s step-end infinite",
                }}
              />
            </span>,
          ].map((content, i) => {
            const num = String(i + 1).padStart(2, "0");
            return (
              <div key={num} style={{ display: "flex", gap: 16, minWidth: 0 }}>
                <span
                  style={{
                    color: "#44406B",
                    userSelect: "none",
                    width: 18,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {num}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{content}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info panel */}
      <div className="terminal-info-panel" style={{ background: "rgba(10,8,38,0.6)" }}>
        {/* Tags */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Tag color={catColor} bg={`${catColor}14`} borderColor={`${catColor}66`}>
            {lesson.category}
          </Tag>
          <Tag color="#6E8BFF" bg="rgba(0,36,255,0.12)" borderColor="rgba(0,36,255,0.5)">
            {diffLabel}
          </Tag>
          <Tag color="#B8B5D1" bg="rgba(5,4,26,0.6)" borderColor="#2A2560">
            {lesson.estimatedMinutes} min
          </Tag>
          <Tag
            color="var(--cosmetic-accent)"
            bg="color-mix(in srgb, var(--cosmetic-accent) 8%, transparent)"
            borderColor="color-mix(in srgb, var(--cosmetic-accent) 40%, transparent)"
          >
            +{lesson.xpReward} XP
          </Tag>
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#7F7BA9",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Leçon · <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>en cours</b> ·
          reprends
        </div>

        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: "#F5F5FA",
            margin: "0 0 14px",
          }}
        >
          {lesson.title}
        </h3>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "#B8B5D1",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          {lesson.description}
        </p>

        {/* The sections still to read are not recorded, so the card says how
            many there are rather than drawing a progress it does not know. */}
        {outline.length > 0 ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#9A96C0",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            {outline.length === 1 ? "1 section" : `${String(outline.length)} sections`} au programme
          </div>
        ) : null}

        {/* CTAs */}
        <div style={{ marginTop: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <Link
            href={`/lessons/${lesson.slug}`}
            className="btn-teal"
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "14px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "var(--cosmetic-accent)",
              color: "#030219",
              border: "1px solid var(--cosmetic-accent)",
              textDecoration: "none",
              boxShadow: "0 0 24px color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)",
            }}
          >
            Reprendre
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7 H11 M8 4 L11 7 L8 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/lessons"
            className="btn-ghost"
            style={{
              padding: "14px 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              color: "#B8B5D1",
              border: "1px solid #2A2560",
              textDecoration: "none",
            }}
          >
            Skip
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReviewsBlock({
  rows,
}: {
  rows: {
    id: string;
    nextReviewAt: Date;
    lesson: {
      slug: string;
      title: string;
      difficulty: string;
      category: string;
      estimatedMinutes: number;
    };
  }[];
}) {
  const now = new Date();
  return (
    <div
      style={{
        border: "1px solid #2A2560",
        background: "rgba(10,8,38,0.4)",
      }}
    >
      {rows.map((row, i) => {
        const catColor = CAT_COLORS[row.lesson.category] ?? "#6E8BFF";
        const catLabel =
          row.lesson.category === "CYBERSEC"
            ? "Cybersec"
            : row.lesson.category === "DEV"
              ? "Développement"
              : "Réseaux";
        const overdueDays = Math.floor((now.getTime() - row.nextReviewAt.getTime()) / 86_400_000);
        const dueLabel =
          overdueDays <= 0
            ? "Dû aujourd'hui"
            : overdueDays === 1
              ? "En retard de 1 j"
              : `En retard de ${String(overdueDays)} j`;
        const index = String(i + 1).padStart(2, "0");

        return (
          <div
            key={row.id}
            className="review-row review-row-layout"
            style={{
              borderBottom: i < rows.length - 1 ? "1px solid #2A2560" : "none",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <span
              className="hidden md:block"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: "#44406B",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {index}
            </span>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#7F7BA9",
                }}
              >
                <span style={{ color: catColor, fontWeight: 600 }}>{catLabel}</span>
                <span>·</span>
                <span>micro-quiz</span>
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 18,
                  color: "#F5F5FA",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {row.lesson.title}
              </h3>
            </div>

            <span
              className="hidden md:inline-flex"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#FFB547",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "currentColor",
                  boxShadow: "0 0 6px currentColor",
                  display: "inline-block",
                }}
              />
              {dueLabel}
            </span>
            <span
              className="hidden md:inline-flex"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#B8B5D1",
                border: "1px solid #2A2560",
                padding: "4px 10px",
                letterSpacing: "0.04em",
              }}
            >
              {row.lesson.estimatedMinutes} min
            </span>
            <Link
              href={`/lessons/${row.lesson.slug}`}
              className="link-action"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#7F7BA9",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Réviser
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7 H11 M8 4 L11 7 L8 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        );
      })}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          background: "rgba(5,4,26,0.5)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "#7F7BA9",
          letterSpacing: "0.08em",
        }}
      >
        <span>Révisions basées sur ta courbe d&apos;oubli · algorithme SM-2</span>
        <span>
          Total ·{" "}
          <b style={{ color: "#F5F5FA" }}>
            ~{rows.reduce((acc, r) => acc + r.lesson.estimatedMinutes, 0)} minutes
          </b>
        </span>
      </div>
    </div>
  );
}

// ── Trophy shelf ──────────────────────────────────────────────────────────────

function TrophyShelf({
  badges,
}: {
  badges: {
    earnedAt: Date;
    badge: { name: string; description: string; rarity: string; iconUrl: string };
  }[];
}) {
  return (
    <div className="trophy-shelf-grid">
      {badges.map((ub) => {
        const rarity = toBadgeRarity(ub.badge.rarity);
        const v = BADGE_RARITY_VAR[rarity];
        const dateStr = ub.earnedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

        return (
          <article
            key={ub.badge.name}
            style={{
              position: "relative",
              padding: "32px 24px 28px",
              border: "1px solid #2A2560",
              background: "rgba(10,8,38,0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              overflow: "hidden",
            }}
          >
            {/* Top rarity strip */}
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${v}, transparent)`,
                boxShadow: `0 0 12px color-mix(in oklab, ${v} 60%, transparent)`,
              }}
              aria-hidden="true"
            />

            {/* Hexagonal medallion: shared component (earned-only showcase) */}
            <BadgeMedallion
              rarity={rarity}
              size="md"
              iconUrl={ub.badge.iconUrl}
              name={ub.badge.name}
              style={{ marginBottom: 22 }}
            />

            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 10,
                color: v,
              }}
            >
              · {BADGE_RARITY_LABELS[rarity]} ·
            </span>
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 20,
                lineHeight: 1.1,
                color: "#F5F5FA",
                margin: "0 0 10px",
                letterSpacing: "-0.01em",
              }}
            >
              {ub.badge.name}
            </h3>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#7F7BA9",
                letterSpacing: "0.08em",
              }}
            >
              Obtenu · {dateStr}
            </span>
          </article>
        );
      })}

      {/* Shelf line */}
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, #3D3785 20%, #3D3785 80%, transparent)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// ── Stats big grid ────────────────────────────────────────────────────────────

/** The four figures (see @cyberlearn/lib/dashboard/stats for what each counts). */
function StatsBig({
  completedThisMonth,
  completedTotal,
  streakDays,
  longestStreak,
  badgesThisMonth,
  badgeTotal,
  certificateCount,
  certifiablePaths,
}: {
  completedThisMonth: number;
  completedTotal: number;
  streakDays: number;
  longestStreak: number;
  badgesThisMonth: number;
  badgeTotal: number;
  certificateCount: number;
  certifiablePaths: number;
}) {
  // The figures and their words are shared with the app's home tab.
  const items = dashboardStats({
    completedThisMonth,
    completedTotal,
    streakDays,
    longestStreak,
    badgesThisMonth,
    badgeTotal,
    certificateCount,
    certifiablePaths,
  }).map((stat) => ({
    label: stat.label.toUpperCase(),
    n: stat.value,
    unit: stat.unit,
    delta: stat.detail,
    highlight: stat.highlight,
  }));

  return (
    <div className="dash-stats-grid">
      {items.map((it) => (
        <div
          key={it.label}
          className="dash-stats-cell"
          style={{
            position: "relative",
            overflow: "hidden",
            background: it.highlight
              ? "linear-gradient(135deg, color-mix(in srgb, var(--cosmetic-accent) 6%, transparent), transparent 60%)"
              : "transparent",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7F7BA9",
              display: "block",
              marginBottom: 18,
            }}
          >
            {it.label}
          </span>

          <div
            className="dash-stat-number"
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              background: it.highlight
                ? "linear-gradient(180deg, #F5F5FA, var(--cosmetic-accent))"
                : undefined,
              WebkitBackgroundClip: it.highlight ? "text" : undefined,
              backgroundClip: it.highlight ? "text" : undefined,
              WebkitTextFillColor: it.highlight ? "transparent" : undefined,
              color: it.highlight ? undefined : "#F5F5FA",
            }}
          >
            {it.n}
            {it.unit && (
              <span
                style={{
                  fontSize: 28,
                  color: "#7F7BA9",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                {it.unit}
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: it.highlight ? "var(--cosmetic-accent)" : "#7F7BA9",
              letterSpacing: "0.04em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {it.highlight && <span style={{ fontSize: 13 }}>↗</span>}
            {it.delta}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Paths grid ────────────────────────────────────────────────────────────────

interface FeaturedPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  _count: { lessons: number; progress: number };
}

/**
 * How far into the leading path the reader is, and what the next step in it is.
 *
 * This is the difference between a section that advertises parcours and a
 * section that runs one. "24 leçons · ~18h · 2.4k complétions" is a poster;
 * "7 sur 24 · prochaine étape : Injection SQL, 25 min" is somewhere to click.
 */
interface PathProgress {
  completed: number;
  total: number;
  next: { position: number; slug: string; title: string; estimatedMinutes: number } | null;
}

const DIFF_COLORS_DASH: Record<string, string> = {
  BEGINNER: "var(--cosmetic-accent)",
  INTERMEDIATE: "#4D8BFF",
  ADVANCED: "#B14DFF",
  EXPERT: "#FFB020",
};
const CAT_LABELS_DASH: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

function PathsGrid({
  paths,
  leadProgress,
}: {
  paths: FeaturedPath[];
  leadProgress: PathProgress | null;
}) {
  if (paths.length === 0) {
    return (
      <div
        style={{
          padding: "48px 32px",
          textAlign: "center",
          border: "1px dashed #2A2560",
          background: "rgba(5,4,26,0.4)",
        }}
      >
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7F7BA9", margin: 0 }}>
          {"// aucun parcours publié pour le moment"}
        </p>
      </div>
    );
  }

  const [primary, secondary] = paths;
  if (!primary) return null;

  const primCat = CAT_LABELS_DASH[primary.category] ?? primary.category;

  // Having started is a state with its own copy, not a variant of the poster:
  // somebody seven lessons in should be offered the eighth, not invited to
  // begin. Null unless there is progress to show, so one check narrows it.
  const progress = leadProgress !== null && leadProgress.completed > 0 ? leadProgress : null;
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : 0;
  const nextStep = progress?.next ?? null;
  const nextHref = nextStep ? `/lessons/${nextStep.slug}` : `/paths/${primary.slug}`;
  const ctaLabel = progress
    ? nextStep
      ? "Reprendre le parcours"
      : "Terminer le parcours"
    : "Commencer le parcours";

  return (
    <div className={`paths-featured-grid${secondary ? " paths-featured-grid--two-col" : ""}`}>
      {/* Primary path */}
      <div
        className="path-primary-card"
        style={{
          position: "relative",
          border: "1px solid #2A2560",
          background:
            "linear-gradient(135deg, rgba(0,36,255,0.15), transparent 60%), rgba(10,8,38,0.7)",
          overflow: "hidden",
          padding: 40,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <NetworkGraph />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 480 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--cosmetic-accent)",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 18,
                height: 1,
                background: "var(--cosmetic-accent)",
                boxShadow: "0 0 6px var(--cosmetic-accent)",
                display: "inline-block",
              }}
            />
            {primCat}
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#F5F5FA",
              margin: "0 0 16px",
            }}
          >
            {primary.title}
          </h3>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              lineHeight: 1.55,
              color: "#B8B5D1",
              margin: "0 0 28px",
              maxWidth: 420,
            }}
          >
            {primary.description}
          </p>
          <div
            style={{
              display: "flex",
              gap: 32,
              marginBottom: 28,
              borderTop: "1px solid #2A2560",
              paddingTop: 20,
            }}
          >
            {[
              progress
                ? {
                    n: `${String(progress.completed)}/${String(progress.total)}`,
                    l: "Leçons faites",
                  }
                : { n: String(primary._count.lessons), l: "Leçons" },
              { n: `~${String(primary.estimatedHours)}h`, l: "Durée" },
              { n: String(primary._count.progress), l: "Complétions" },
            ].map(({ n, l }) => (
              <div key={l}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: 28,
                    color: "#F5F5FA",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {n}
                </div>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "#7F7BA9",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginTop: 6,
                  }}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>

          {progress && (
            <div style={{ marginBottom: 28 }}>
              <div
                className="path-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.completed}
                aria-label={`Progression du parcours ${primary.title}`}
              >
                <span className="path-progress-fill" style={{ width: `${String(percent)}%` }} />
              </div>
              <div className="path-progress-foot">
                <span>{String(percent)}% du parcours</span>
                {nextStep && (
                  <span>
                    Prochaine étape · <b>{nextStep.title}</b> · {String(nextStep.estimatedMinutes)}{" "}
                    min
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, position: "relative", zIndex: 2 }}>
          <Link
            href={nextHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "14px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "var(--cosmetic-accent)",
              color: "#030219",
              border: "1px solid var(--cosmetic-accent)",
              textDecoration: "none",
              boxShadow: "0 0 24px color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)",
            }}
          >
            {ctaLabel}
          </Link>
          <Link
            href={progress ? `/paths/${primary.slug}` : "/paths"}
            style={{
              padding: "14px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              color: "#B8B5D1",
              border: "1px solid #2A2560",
              textDecoration: "none",
            }}
          >
            {progress ? "Voir le parcours" : "Tous les parcours"}
          </Link>
        </div>
      </div>

      {/* Secondary path */}
      {secondary && (
        <div
          className="path-secondary-card"
          style={{
            position: "relative",
            border: "1px solid #2A2560",
            background: "rgba(10,8,38,0.4)",
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7F7BA9",
              marginBottom: 16,
            }}
          >
            {CAT_LABELS_DASH[secondary.category] ?? secondary.category}
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 24,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#F5F5FA",
              margin: "0 0 12px",
            }}
          >
            {secondary.title}
          </h3>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              lineHeight: 1.55,
              color: "#B8B5D1",
              margin: "0 0 auto",
            }}
          >
            {secondary.description}
          </p>
          <div style={{ display: "flex", gap: 8, margin: "20px 0 16px", flexWrap: "wrap" }}>
            <Tag
              color={DIFF_COLORS_DASH[secondary.difficulty] ?? "#7F7BA9"}
              bg={`${DIFF_COLORS_DASH[secondary.difficulty] ?? "#7F7BA9"}14`}
              borderColor={`${DIFF_COLORS_DASH[secondary.difficulty] ?? "#7F7BA9"}40`}
            >
              {secondary.difficulty}
            </Tag>
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.06em",
              marginBottom: 20,
            }}
          >
            <span>
              <b style={{ color: "#F5F5FA", fontWeight: 700 }}>
                {String(secondary._count.lessons)}
              </b>{" "}
              leçons
            </span>
            <span>
              <b style={{ color: "#F5F5FA", fontWeight: 700 }}>
                ~{String(secondary.estimatedHours)}h
              </b>
            </span>
          </div>
          <Link
            href={`/paths/${secondary.slug}`}
            style={{
              padding: "14px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "transparent",
              color: "#B8B5D1",
              border: "1px solid #2A2560",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Explorer →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Network graph SVG (path feature visual) ───────────────────────────────────

function NetworkGraph() {
  type NodeKind = "core" | "done" | "open";
  const nodes: { id: string; x: number; y: number; r: number; kind: NodeKind }[] = [
    { id: "c", x: 420, y: 220, r: 28, kind: "core" },
    { id: "n1", x: 240, y: 110, r: 14, kind: "done" },
    { id: "n2", x: 320, y: 80, r: 12, kind: "done" },
    { id: "n3", x: 560, y: 90, r: 14, kind: "open" },
    { id: "n4", x: 680, y: 150, r: 12, kind: "open" },
    { id: "n5", x: 200, y: 250, r: 12, kind: "done" },
    { id: "n6", x: 150, y: 350, r: 14, kind: "open" },
    { id: "n7", x: 290, y: 400, r: 12, kind: "open" },
    { id: "n8", x: 540, y: 380, r: 14, kind: "open" },
    { id: "n9", x: 700, y: 320, r: 12, kind: "open" },
    { id: "n10", x: 440, y: 60, r: 10, kind: "done" },
    { id: "n11", x: 640, y: 250, r: 10, kind: "open" },
  ];
  const edges: [string, string][] = [
    ["c", "n1"],
    ["c", "n2"],
    ["c", "n3"],
    ["c", "n4"],
    ["c", "n5"],
    ["c", "n6"],
    ["c", "n7"],
    ["c", "n8"],
    ["c", "n9"],
    ["c", "n10"],
    ["c", "n11"],
    ["n1", "n2"],
    ["n1", "n5"],
    ["n5", "n6"],
    ["n6", "n7"],
    ["n3", "n10"],
    ["n3", "n4"],
    ["n4", "n11"],
    ["n11", "n9"],
    ["n8", "n9"],
    ["n7", "n8"],
  ];
  const find = (id: string): { id: string; x: number; y: number; r: number; kind: NodeKind } => {
    const node = nodes.find((n) => n.id === id);
    if (!node) throw new Error(`Node ${id} not found`);
    return node;
  };

  return (
    <svg
      viewBox="0 0 800 460"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      // Faded out over the left half, where the title and the description sit.
      // The graph is decoration and this card is now the first thing on the
      // page: a glowing node behind the word "Pentester" is noise on the one
      // line that has to be read.
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.75,
        pointerEvents: "none",
        maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.25) 52%, #000 82%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.25) 52%, #000 82%)",
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--cosmetic-accent)" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#0024FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0024FF" stopOpacity="0" />
        </radialGradient>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {edges.map(([a, b], i) => {
        const A = find(a),
          B = find(b);
        const isDone = A.kind === "done" || B.kind === "done";
        return (
          <line
            key={i}
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={
              isDone
                ? "color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)"
                : "rgba(42,37,96,0.5)"
            }
            strokeWidth={isDone ? 1 : 0.6}
            strokeDasharray={isDone ? undefined : "2 3"}
          />
        );
      })}

      <circle cx={find("c").x} cy={find("c").y} r="80" fill="url(#coreGlow)" />

      {nodes.map((n) => {
        const fill = n.kind !== "open" ? "var(--cosmetic-accent)" : "#0A0826";
        const stroke = n.kind === "open" ? "rgba(110,139,255,0.5)" : "var(--cosmetic-accent)";
        const glow = n.kind !== "open";
        return (
          <g key={n.id}>
            {glow && (
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r * 2}
                fill={fill}
                opacity="0.15"
                filter="url(#nodeGlow)"
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={fill}
              stroke={stroke}
              strokeWidth="1.5"
              opacity={n.kind === "core" ? 1 : 0.85}
            />
            {n.kind === "core" && <circle cx={n.x} cy={n.y} r={n.r - 8} fill="#0A0826" />}
          </g>
        );
      })}
    </svg>
  );
}

// ── Tag component ─────────────────────────────────────────────────────────────

function Tag({
  color,
  bg,
  borderColor,
  children,
}: {
  color: string;
  bg: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        border: `1px solid ${borderColor}`,
        borderRadius: 1,
        whiteSpace: "nowrap",
        color,
        background: bg,
      }}
    >
      {children}
    </span>
  );
}
