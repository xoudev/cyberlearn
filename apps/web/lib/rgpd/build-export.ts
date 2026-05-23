import { prisma } from "@cyberlearn/db";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr";

export interface ExportPayload {
  exportMetadata: {
    exportedAt: string;
    version: string;
    format: string;
    rgpdContext: string;
    rights: string;
    limitations: { notifications: string };
  };
  profile: {
    email: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    xpTotal: number;
    level: number;
    streakDays: number;
    lastActiveAt: Date;
    createdAt: Date;
  } | null;
  preferences: {
    theme: string;
    locale: string;
    emailNotifications: boolean;
    reviewReminders: boolean;
    weeklyDigest: boolean;
    publicProfile: boolean;
  } | null;
  placementTest: {
    devScore: number;
    cybersecScore: number;
    networkScore: number;
    completedAt: Date;
  } | null;
  lessonsProgress: {
    lessonTitle: string;
    lessonSlug: string;
    status: string;
    attempts: number;
    bestScore: number | null;
    timeSpentSeconds: number;
    startedAt: Date;
    completedAt: Date | null;
    lastAccessedAt: Date;
  }[];
  pathsProgress: {
    pathTitle: string;
    pathSlug: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
  }[];
  challengesProgress: {
    challengeTitle: string;
    challengeSlug: string;
    status: string;
    attempts: number;
    startedAt: Date;
    completedAt: Date | null;
  }[];
  hintsRevealed: { hintId: string; revealedAt: Date }[];
  badges: {
    name: string;
    rarity: string;
    description: string;
    earnedAt: Date;
    context: unknown;
  }[];
  certificates: {
    publicId: string;
    pathTitle: string;
    issuedAt: Date;
    expiresAt: Date | null;
    sha256Hash: string;
    downloadUrl: string;
    verifyUrl: string;
    revokedAt: Date | null;
    revokedReason: string | null;
  }[];
  reviewSchedules: {
    lessonTitle: string;
    lessonSlug: string;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewAt: Date;
    lastReviewedAt: Date;
  }[];
  ratings: {
    contentTitle: string | null;
    contentType: "lesson" | "path";
    score: number;
    feedback: string | null;
    createdAt: Date;
  }[];
  qaActivity: {
    questions: {
      lessonTitle: string;
      lessonSlug: string;
      title: string;
      content: string;
      isResolved: boolean;
      createdAt: Date;
    }[];
    answers: {
      questionId: string;
      questionTitle: string;
      content: string;
      isAccepted: boolean;
      upvotes: number;
      createdAt: Date;
    }[];
  };
  contactTickets: {
    subject: string;
    theme: string;
    message: string;
    status: string;
    jiraIssueKey: string | null;
    createdAt: Date;
  }[];
  notifications: {
    type: string;
    title: string;
    body: string;
    actionUrl: string | null;
    scheduledFor: Date;
    sentAt: Date | null;
    readAt: Date | null;
  }[];
  skipWaivers: {
    lessonTitle: string;
    lessonSlug: string;
    grantedAt: Date;
    grantReason: string;
  }[];
}

export async function buildExportPayload(userId: string): Promise<ExportPayload> {
  const [
    profile,
    prefs,
    placement,
    lessonProgress,
    pathProgress,
    challengeProgress,
    hintReveals,
    badges,
    certs,
    reviewSchedules,
    ratings,
    questions,
    answers,
    tickets,
    notifications,
    skipWaivers,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        xpTotal: true,
        level: true,
        streakDays: true,
        lastActiveAt: true,
        createdAt: true,
      },
    }),
    prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        theme: true,
        locale: true,
        emailNotifications: true,
        reviewReminders: true,
        weeklyDigest: true,
        publicProfile: true,
      },
    }),
    prisma.userPlacementResult.findUnique({
      where: { userId },
      select: { devScore: true, cybersecScore: true, networkScore: true, completedAt: true },
    }),
    prisma.userLessonProgress.findMany({
      where: { userId },
      select: {
        status: true,
        attempts: true,
        bestScore: true,
        timeSpentSeconds: true,
        startedAt: true,
        completedAt: true,
        lastAccessedAt: true,
        lesson: { select: { title: true, slug: true } },
      },
    }),
    prisma.userPathProgress.findMany({
      where: { userId },
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
        path: { select: { title: true, slug: true } },
      },
    }),
    prisma.userChallengeProgress.findMany({
      where: { userId },
      select: {
        status: true,
        attempts: true,
        startedAt: true,
        completedAt: true,
        challenge: { select: { title: true, slug: true } },
      },
    }),
    prisma.challengeHintReveal.findMany({
      where: { userId },
      select: { hintId: true, revealedAt: true },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      select: {
        earnedAt: true,
        context: true,
        badge: { select: { name: true, rarity: true, description: true } },
      },
    }),
    prisma.certificate.findMany({
      where: { userId },
      select: {
        id: true,
        publicId: true,
        issuedAt: true,
        expiresAt: true,
        sha256Hash: true,
        revokedAt: true,
        revokedReason: true,
        path: { select: { title: true } },
      },
    }),
    prisma.reviewSchedule.findMany({
      where: { userId },
      select: {
        easeFactor: true,
        intervalDays: true,
        repetitions: true,
        nextReviewAt: true,
        lastReviewedAt: true,
        lesson: { select: { title: true, slug: true } },
      },
    }),
    prisma.rating.findMany({
      where: { userId },
      select: {
        score: true,
        feedback: true,
        createdAt: true,
        lesson: { select: { title: true } },
        path: { select: { title: true } },
      },
    }),
    prisma.lessonQuestion.findMany({
      where: { userId },
      select: {
        title: true,
        content: true,
        isResolved: true,
        createdAt: true,
        lesson: { select: { title: true, slug: true } },
      },
    }),
    prisma.lessonAnswer.findMany({
      where: { userId },
      select: {
        content: true,
        isAccepted: true,
        upvotes: true,
        createdAt: true,
        question: { select: { id: true, title: true } },
      },
    }),
    prisma.contactTicket.findMany({
      where: { userId },
      select: {
        subject: true,
        theme: true,
        message: true,
        status: true,
        jiraIssueKey: true,
        createdAt: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { scheduledFor: "desc" },
      take: 1000,
      select: {
        type: true,
        title: true,
        body: true,
        actionUrl: true,
        scheduledFor: true,
        sentAt: true,
        readAt: true,
      },
    }),
    prisma.userSkipWaiver.findMany({
      where: { userId },
      select: {
        grantedAt: true,
        grantReason: true,
        lesson: { select: { title: true, slug: true } },
      },
    }),
  ]);

  return {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      format: "json",
      rgpdContext: "Article 20 RGPD - Droit à la portabilité",
      rights: `${APP_URL}/privacy#section-7`,
      limitations: {
        notifications: "Les 1000 notifications les plus récentes sont incluses.",
      },
    },
    profile,
    preferences: prefs,
    placementTest: placement,
    lessonsProgress: lessonProgress.map((p) => ({
      lessonTitle: p.lesson.title,
      lessonSlug: p.lesson.slug,
      status: p.status,
      attempts: p.attempts,
      bestScore: p.bestScore,
      timeSpentSeconds: p.timeSpentSeconds,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      lastAccessedAt: p.lastAccessedAt,
    })),
    pathsProgress: pathProgress.map((p) => ({
      pathTitle: p.path.title,
      pathSlug: p.path.slug,
      status: p.status,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
    })),
    challengesProgress: challengeProgress.map((p) => ({
      challengeTitle: p.challenge.title,
      challengeSlug: p.challenge.slug,
      status: p.status,
      attempts: p.attempts,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
    })),
    hintsRevealed: hintReveals,
    badges: badges.map((b) => ({
      name: b.badge.name,
      rarity: b.badge.rarity,
      description: b.badge.description,
      earnedAt: b.earnedAt,
      context: b.context,
    })),
    certificates: certs.map((c) => ({
      publicId: c.publicId,
      pathTitle: c.path.title,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      sha256Hash: c.sha256Hash,
      downloadUrl: `${APP_URL}/api/certificates/${c.id}/download`,
      verifyUrl: `${APP_URL}/verify/${c.publicId}`,
      revokedAt: c.revokedAt,
      revokedReason: c.revokedReason,
    })),
    reviewSchedules: reviewSchedules.map((rs) => ({
      lessonTitle: rs.lesson.title,
      lessonSlug: rs.lesson.slug,
      easeFactor: rs.easeFactor,
      intervalDays: rs.intervalDays,
      repetitions: rs.repetitions,
      nextReviewAt: rs.nextReviewAt,
      lastReviewedAt: rs.lastReviewedAt,
    })),
    ratings: ratings.map((r) => ({
      contentTitle: r.lesson?.title ?? r.path?.title ?? null,
      contentType: r.lesson !== null ? ("lesson" as const) : ("path" as const),
      score: r.score,
      feedback: r.feedback,
      createdAt: r.createdAt,
    })),
    qaActivity: {
      questions: questions.map((q) => ({
        lessonTitle: q.lesson.title,
        lessonSlug: q.lesson.slug,
        title: q.title,
        content: q.content,
        isResolved: q.isResolved,
        createdAt: q.createdAt,
      })),
      answers: answers.map((a) => ({
        questionId: a.question.id,
        questionTitle: a.question.title,
        content: a.content,
        isAccepted: a.isAccepted,
        upvotes: a.upvotes,
        createdAt: a.createdAt,
      })),
    },
    contactTickets: tickets,
    notifications,
    skipWaivers: skipWaivers.map((w) => ({
      lessonTitle: w.lesson.title,
      lessonSlug: w.lesson.slug,
      grantedAt: w.grantedAt,
      grantReason: w.grantReason,
    })),
  };
}
