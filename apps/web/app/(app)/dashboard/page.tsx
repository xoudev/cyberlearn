import React, { Suspense } from "react";
import Link from "next/link";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { LevelRing } from "./_components/level-ring";
import { MissionCard, type MissionCardProps } from "./_components/mission-card";
import { ReviewsDue } from "./_components/reviews-due";
import { Standing } from "./_components/standing";
import { WelcomeModal } from "./_components/welcome-modal";
import { computeLevel, msUntilWeekReset } from "@cyberlearn/lib";
import { rankFeaturedPaths } from "@cyberlearn/lib/dashboard/featured-paths";
import { currentLessonId, moduleRoute } from "@cyberlearn/lib/dashboard/module-route";
import { rankName } from "@cyberlearn/lib/dashboard/rank-name";
import { dashboardStats } from "@cyberlearn/lib/dashboard/stats";
import { fmtWeekReset } from "@cyberlearn/lib/gamification/weekly-quests";
import {
  CATALOGUE_PATH,
  leaderboardRepository,
  pathsVisibleTo,
  prisma,
  reviewRepository,
} from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import { StreakCard } from "@/components/streak-card";
import { QuestsPanel } from "@/components/quests-panel";

const CAT_LABELS: Record<string, string> = {
  DEV: "Développement",
  CYBERSEC: "Cybersécurité",
  NETWORK: "Réseau",
};

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

/**
 * The dashboard answers one question: what do I do now?
 *
 * So it has one strong card, the mission, with the module it sits in drawn
 * beside it; under it the revisions due and the week; and at the bottom, in
 * one line, where the reader stands. The level is a ring in the header, the
 * streak a flame beside the greeting. Nothing is numbered, nothing pretends
 * to be a terminal.
 */
async function DashboardContent(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  const now = new Date();
  /** Midnight on the first of the current month, local time - "ce mois-ci". */
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    dbUser,
    inProgressRows,
    reviewSession,
    completedTotal,
    completedThisMonth,
    badgeRows,
    badgeTotal,
    badgesThisMonth,
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
            description: true,
            category: true,
            estimatedMinutes: true,
            xpReward: true,
          },
        },
      },
      orderBy: { lastAccessedAt: "desc" },
      take: 1,
    }),
    // The day's session, as the page and the sidebar count it: five at most,
    // of the lessons still published.
    reviewRepository.findSession(authUser.id, now),
    prisma.userLessonProgress.count({ where: { userId: authUser.id, status: "COMPLETED" } }),
    prisma.userLessonProgress.count({
      where: { userId: authUser.id, status: "COMPLETED", completedAt: { gte: monthStart } },
    }),
    prisma.userBadge.findMany({
      where: { userId: authUser.id },
      include: { badge: { select: { name: true, rarity: true, iconUrl: true } } },
      orderBy: { earnedAt: "desc" },
      take: 3,
    }),
    prisma.userBadge.count({ where: { userId: authUser.id } }),
    prisma.userBadge.count({ where: { userId: authUser.id, earnedAt: { gte: monthStart } } }),
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
        progress: { where: { userId: authUser.id }, select: { status: true }, take: 1 },
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

  const dueReviews = reviewSession.rows.slice(0, 3);
  const dueTotal = reviewSession.rows.length;
  const { level, current, needed } = computeLevel(dbUser?.xpTotal ?? 0);
  const xpPercent = needed > 0 ? Math.min((current / needed) * 100, 100) : 0;
  const firstName = (dbUser?.displayName ?? "Opérateur").split(" ")[0] ?? "Opérateur";
  const streakDays = dbUser?.streakDays ?? 0;

  // ── The path that leads: the same ranking as the app's home tab ──────────
  const [lead] = rankFeaturedPaths(
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
  );

  // Its lessons and modules, to draw the module the reader is in; and which
  // of those lessons are done. Only for the one path that leads.
  const leadDetail = lead
    ? await prisma.path.findUnique({
        where: { id: lead.id },
        select: {
          modules: {
            orderBy: { position: "asc" },
            select: { id: true, position: true, title: true },
          },
          lessons: {
            orderBy: { position: "asc" },
            select: {
              moduleId: true,
              lesson: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  description: true,
                  estimatedMinutes: true,
                  xpReward: true,
                },
              },
            },
          },
        },
      })
    : null;
  const leadLessonIds = leadDetail?.lessons.map((pl) => pl.lesson.id) ?? [];
  const completedInLead = new Set(
    leadLessonIds.length > 0
      ? (
          await prisma.userLessonProgress.findMany({
            where: { userId: authUser.id, status: "COMPLETED", lessonId: { in: leadLessonIds } },
            select: { lessonId: true },
          })
        ).map((row) => row.lessonId)
      : [],
  );

  const resume = inProgressRows[0]?.lesson ?? null;
  const mission = planMission({
    lead: lead && leadDetail ? { ...lead, ...leadDetail } : null,
    completedInLead,
    resume,
  });

  const dateLabel = capitalize(
    now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
  );
  const heroNotes: React.ReactNode[] = [];
  if (streakDays > 0) {
    heroNotes.push(
      <span key="streak" className="dash-flame">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
        </svg>
        <b>
          {streakDays} jour{streakDays > 1 ? "s" : ""}
        </b>
        &nbsp;de série
      </span>,
    );
  }
  if (wantsRevisions && dueTotal > 0) {
    heroNotes.push(
      <Link key="reviews" href="/revisions">
        <b>
          {dueTotal} révision{dueTotal > 1 ? "s" : ""}
        </b>{" "}
        {dueTotal > 1 ? "t'attendent" : "t'attend"}
      </Link>,
    );
  }
  if (heroNotes.length === 0) {
    heroNotes.push(<span key="nudge">Une leçon aujourd&apos;hui lance une série.</span>);
  }

  const stats = dashboardStats({
    completedThisMonth,
    completedTotal,
    streakDays,
    longestStreak: dbUser?.longestStreak ?? 0,
    badgesThisMonth,
    badgeTotal,
    certificateCount,
    certifiablePaths,
  });

  return (
    <div className="page-container">
      <div className="dash">
        {/* ── Hero: the greeting, and the level ───────────────────────────── */}
        <section className="dash-hero">
          <div>
            <div className="dash-hero-date">{dateLabel}</div>
            <h1>
              Bonjour, <em>{firstName}</em>.
            </h1>
            <p className="dash-hero-sub">
              {heroNotes.map((note, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <i className="dash-hero-sep" aria-hidden="true" />}
                  {note}
                </React.Fragment>
              ))}
            </p>
          </div>
          <LevelRing
            level={level}
            rankName={rankName(level)}
            xpCurrent={current}
            xpNeeded={needed}
            xpPercent={xpPercent}
            xpNeededToNext={Math.max(needed - current, 0)}
            userRank={userRank}
          />
        </section>

        {/* ── The mission ─────────────────────────────────────────────────── */}
        <MissionCard {...mission} />

        {/* ── What is due, and the week ────────────────────────────────────── */}
        <div className={`dash-cols${wantsRevisions ? "" : " dash-cols--single"}`}>
          {wantsRevisions && <ReviewsDue rows={dueReviews} dueTotal={dueTotal} now={now} />}

          <section className="dash-sec" aria-labelledby="dash-week-title">
            <div className="dash-sec-head">
              <h2 id="dash-week-title">Cette semaine</h2>
              <span className="dash-sec-count">
                reset dans {fmtWeekReset(msUntilWeekReset(now))}
              </span>
            </div>
            <div className="dash-week">
              <QuestsPanel userId={authUser.id} />
              <StreakCard userId={authUser.id} />
            </div>
          </section>
        </div>

        {/* ── Where the reader stands ──────────────────────────────────────── */}
        <Standing stats={stats} badges={badgeRows} badgeTotal={badgeTotal} />
      </div>
    </div>
  );
}

// ── The mission ───────────────────────────────────────────────────────────────

interface LeadPath {
  id: string;
  slug: string;
  title: string;
  modules: { id: string; position: number; title: string }[];
  lessons: {
    moduleId: string | null;
    lesson: {
      id: string;
      slug: string;
      title: string;
      description: string;
      estimatedMinutes: number;
      xpReward: number;
    };
  }[];
}

interface ResumeLesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  xpReward: number;
}

/**
 * What the card offers.
 *
 * A lesson left open wins: it is what the reader was doing. Otherwise the next
 * lesson of the path that leads. A path with nothing left offers its page, for
 * the exam; a reader with no path at all is sent to choose one. The route
 * beside the text is always the leading path's module, centred on the lesson
 * offered when it belongs to that path.
 */
function planMission({
  lead,
  completedInLead,
  resume,
}: {
  lead: LeadPath | null;
  completedInLead: ReadonlySet<string>;
  resume: ResumeLesson | null;
}): MissionCardProps {
  const minutesAndXp = (lesson: { estimatedMinutes: number; xpReward: number }): string =>
    `${String(lesson.estimatedMinutes)} min · +${String(lesson.xpReward)} XP`;

  if (lead) {
    const routeLessons = lead.lessons.map((pl) => ({
      id: pl.lesson.id,
      slug: pl.lesson.slug,
      title: pl.lesson.title,
      moduleId: pl.moduleId,
    }));
    const route = moduleRoute(routeLessons, lead.modules, completedInLead, resume?.id ?? null);
    const path = {
      completed: completedInLead.size,
      total: routeLessons.length,
      href: `/paths/${lead.slug}`,
    };
    const current = currentLessonId(routeLessons, completedInLead, resume?.id ?? null);
    const resumeInLead = resume !== null && routeLessons.some((l) => l.id === resume.id);
    const lesson = resume ?? lead.lessons.find((pl) => pl.lesson.id === current)?.lesson ?? null;

    if (lesson) {
      const started = completedInLead.size > 0 || resume !== null;
      return {
        eyebrow: resume ? "Leçon en cours" : started ? "Prochaine mission" : "Première mission",
        context:
          resume && !resumeInLead ? (CAT_LABELS[resume.category] ?? resume.category) : lead.title,
        title: lesson.title,
        description: lesson.description,
        cta: {
          href: `/lessons/${lesson.slug}`,
          label: resume ? "Reprendre la leçon" : "Commencer la leçon",
        },
        meta: minutesAndXp(lesson),
        aside: { href: "/paths", label: "Tous les parcours" },
        route,
        path,
      };
    }

    return {
      eyebrow: "Parcours terminé",
      context: lead.title,
      title: "Toutes les leçons de ce parcours sont faites.",
      description:
        "Il reste l'examen final s'il n'est pas passé, puis le parcours suivant t'attend.",
      cta: { href: `/paths/${lead.slug}`, label: "Voir le parcours" },
      meta: null,
      aside: { href: "/paths", label: "Tous les parcours" },
      route,
      path,
    };
  }

  if (resume) {
    return {
      eyebrow: "Leçon en cours",
      context: CAT_LABELS[resume.category] ?? resume.category,
      title: resume.title,
      description: resume.description,
      cta: { href: `/lessons/${resume.slug}`, label: "Reprendre la leçon" },
      meta: minutesAndXp(resume),
      aside: { href: "/lessons", label: "Toutes les leçons" },
      route: null,
      path: null,
    };
  }

  return {
    eyebrow: "Pour commencer",
    context: null,
    title: "Choisis un parcours.",
    description:
      "Un parcours enchaîne ses leçons dans l'ordre, module par module, et se termine par un examen et un certificat.",
    cta: { href: "/paths", label: "Voir les parcours" },
    meta: null,
    aside: null,
    route: null,
    path: null,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
