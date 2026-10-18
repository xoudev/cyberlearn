import { readDraw, readSessionAnswers } from "@cyberlearn/lib/revisions/cards";
import { badgeRepository } from "../repositories/badge.repository.js";
import { certificateRepository } from "../repositories/certificate.repository.js";
import { challengeRepository } from "../repositories/challenge.repository.js";
import { contentReportRepository } from "../repositories/content-report.repository.js";
import { cosmeticRepository } from "../repositories/cosmetic.repository.js";
import { duelRepository } from "../repositories/duel.repository.js";
import { leagueRepository } from "../repositories/league.repository.js";
import { lessonProgressRepository } from "../repositories/lesson-progress.repository.js";
import { lessonQuizRepository } from "../repositories/lesson-quiz.repository.js";
import { mockExamRepository } from "../repositories/mock-exam.repository.js";
import { noteFolderRepository } from "../repositories/note-folder.repository.js";
import { noteReportRepository } from "../repositories/note-report.repository.js";
import { noteRepository } from "../repositories/note.repository.js";
import {
  NOTIFICATION_EXPORT_LIMIT,
  notificationRepository,
} from "../repositories/notification.repository.js";
import { pathRepository } from "../repositories/path.repository.js";
import { placementRepository } from "../repositories/placement.repository.js";
import { preferencesRepository } from "../repositories/preferences.repository.js";
import { qaRepository } from "../repositories/qa.repository.js";
import { questRepository } from "../repositories/quest.repository.js";
import { quizReportRepository } from "../repositories/quiz-report.repository.js";
import { quizRepository } from "../repositories/quiz.repository.js";
import { ratingRepository } from "../repositories/rating.repository.js";
import { reviewCardRepository } from "../repositories/review-card.repository.js";
import { reviewScheduleLegacyRepository } from "../repositories/review-schedule-legacy.repository.js";
import { streakRepository } from "../repositories/streak.repository.js";
import { ticketRepository } from "../repositories/ticket.repository.js";
import { tournamentRepository } from "../repositories/tournament.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { wrappedRepository } from "../repositories/wrapped.repository.js";
import { writeupRepository } from "../repositories/writeup.repository.js";
import { xpLedgerRepository } from "../repositories/xp-ledger.repository.js";

/**
 * Everything the platform holds about one account, as the JSON file it
 * downloads (RGPD art. 15 and 20).
 *
 * This lived in apps/web, behind the account holder's own /api/me/export.
 * The console answers a request made to the team (a letter, a mail to
 * privacy@, an account that can no longer sign in) with the same file, so
 * there is one builder and both apps call it: a section added here reaches
 * both, and a second copy could not quietly drift from the first.
 *
 * Every read goes through the repository of its table, each limited to the
 * account's own rows. The sections, their keys and their order are the file's
 * format: a reader of last year's export reads this year's the same way, and
 * build-export.test.ts pins them.
 */

export interface ExportOptions {
  /**
   * The learner site's address, which the certificates' download and
   * verification links point at. The caller passes it: each app reads its
   * own environment.
   */
  siteUrl: string;
}

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
    /** The answers to "what brings you here", as given at sign-up or since. */
    learningGoals: string[];
    startingLevel: string | null;
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
    quizCorrect: number | null;
    quizTotal: number | null;
  }[];
  /** Every quiz answer given in a lesson: the first one, which is the one kept. */
  lessonQuizAnswers: {
    lessonTitle: string;
    quizId: string;
    selected: number;
    correct: boolean;
    answeredAt: Date;
  }[];
  /** Every report on a lesson quiz, with the comment written for the team. */
  quizReports: {
    lessonTitle: string;
    quizId: string;
    reason: string;
    comment: string | null;
    status: string;
    createdAt: Date;
  }[];
  /**
   * Every report this person made on a note shared with them: their reason
   * and comment. Not the note itself, which is its author's.
   */
  noteReports: {
    lessonTitle: string;
    reason: string;
    comment: string | null;
    status: string;
    createdAt: Date;
  }[];
  /**
   * Every report this person made on what somebody else published (a forum
   * message, a question or an answer, a solution, a class resource): where,
   * their reason and comment. Not the content, which is its author's.
   */
  contentReports: {
    surface: string;
    contentId: string;
    reason: string;
    comment: string | null;
    status: string;
    createdAt: Date;
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
  /**
   * The retired lesson-level review queue (SM-2): its rows are kept, out of
   * use, until they are converted into review cards and a later release drops
   * their table. Listed until then, since the platform still holds them.
   */
  reviewSchedules: {
    lessonTitle: string;
    lessonSlug: string;
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewAt: Date;
    lastReviewedAt: Date;
  }[];
  /** The lesson questions to be asked again, each in its box, retired ones included. */
  reviewCards: {
    lessonTitle: string;
    lessonSlug: string;
    quizId: string;
    box: number;
    dueAt: Date;
    lapses: number;
    everCorrect: boolean;
    lastAnsweredAt: Date | null;
    retiredAt: Date | null;
    createdAt: Date;
  }[];
  /** The daily review sessions: the questions drawn, in the order asked, and the answers given. */
  reviewSessions: {
    day: Date;
    questions: {
      lessonTitle: string;
      quizId: string;
      /** The options in the order shown: `optionOrder[k]` is the lesson's index of the k-th one. */
      optionOrder: number[];
      /** The shown option picked, null when left unanswered. */
      selected: number | null;
    }[];
    completedAt: Date | null;
    xpCredited: boolean;
    createdAt: Date;
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
  /** The quiz duels played, sent or received, with the reader's own answers. */
  duels: {
    pathTitle: string;
    role: "challenger" | "opponent";
    status: string;
    won: boolean | null;
    createdAt: Date;
    finishedAt: Date | null;
    answers: { index: number; selected: number; correct: boolean; answeredAt: Date }[];
  }[];
  /**
   * The flags found in CTF tournaments, and what each was worth there. A flag
   * the team took back keeps its row, with when and why; who took it back is
   * the team's, not the player's.
   */
  tournamentSolves: {
    tournamentTitle: string;
    challengeTitle: string;
    points: number;
    solvedAt: Date;
    disqualifiedAt: Date | null;
    disqualifiedReason: string | null;
  }[];
  /** The mock exams handed in, with their score by module. */
  mockExams: {
    pathTitle: string;
    score: number | null;
    domains: unknown;
    late: boolean;
    startedAt: Date;
    submittedAt: Date | null;
  }[];
  /** The solutions published to challenges, hidden ones included. */
  challengeWriteups: {
    challengeTitle: string;
    challengeSlug: string;
    content: string;
    isHidden: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
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
  // Art. 15 covers every personal datum, not just the ones the product
  // surfaces. Notes in particular are free text written by the account holder.
  notes: {
    lessonTitle: string | null;
    folderName: string | null;
    content: string;
    wordCount: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  noteFolders: { name: string; color: string | null; createdAt: Date }[];
  quizAttempts: {
    pathTitle: string | null;
    score: number;
    passed: boolean;
    answers: unknown;
    startedAt: Date;
    submittedAt: Date | null;
  }[];
  activityDays: { day: Date; count: number }[];
  questProgress: {
    weekKey: string;
    progress: number;
    completed: boolean;
    claimed: boolean;
    completedAt: Date | null;
  }[];
  leagueMemberships: {
    division: string;
    seasonXp: number;
    finalRank: number | null;
    globalRank: number | null;
    joinedAt: Date;
  }[];
  xpLedger: { amount: number; source: string; createdAt: Date }[];
  wrappedSnapshots: { period: string; periodKey: string; payload: unknown; createdAt: Date }[];
  cosmeticsUnlocked: { cosmeticId: string; unlockedAt: Date }[];
  cosmeticLoadout: {
    terminalTheme: string | null;
    hexagonStyle: string | null;
    profileFrame: string | null;
    accentColor: string | null;
  } | null;
  answerUpvotes: { answerId: string; createdAt: Date }[];
}

export async function buildExportPayload(
  userId: string,
  options: ExportOptions,
): Promise<ExportPayload> {
  const { siteUrl } = options;
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
    writeups,
    mockExams,
    duels,
    tournamentSolves,
    tickets,
    notifications,
    skipWaivers,
    notes,
    noteFolders,
    quizAttempts,
    activityDays,
    questProgress,
    leagueMemberships,
    xpLedger,
    wrappedSnapshots,
    cosmeticsUnlocked,
    cosmeticLoadout,
    answerUpvotes,
    lessonQuizAnswers,
    quizReports,
    noteReports,
    contentReports,
    review,
  ] = await Promise.all([
    userRepository.exportProfileFor(userId),
    preferencesRepository.exportFor(userId),
    placementRepository.exportResultFor(userId),
    lessonProgressRepository.exportFor(userId),
    pathRepository.exportProgressFor(userId),
    challengeRepository.exportProgressFor(userId),
    challengeRepository.exportHintRevealsFor(userId),
    badgeRepository.exportFor(userId),
    certificateRepository.exportFor(userId),
    reviewScheduleLegacyRepository.listForExport(userId),
    ratingRepository.exportFor(userId),
    qaRepository.exportQuestionsFor(userId),
    qaRepository.exportAnswersFor(userId),
    writeupRepository.exportFor(userId),
    mockExamRepository.exportFor(userId),
    duelRepository.exportFor(userId),
    tournamentRepository.exportSolvesFor(userId),
    ticketRepository.exportFor(userId),
    notificationRepository.exportFor(userId),
    placementRepository.exportSkipWaiversFor(userId),
    noteRepository.exportFor(userId),
    noteFolderRepository.exportFor(userId),
    quizRepository.exportAttemptsFor(userId),
    streakRepository.exportActivityDaysFor(userId),
    questRepository.exportProgressFor(userId),
    leagueRepository.exportMembershipsFor(userId),
    xpLedgerRepository.exportFor(userId),
    wrappedRepository.exportFor(userId),
    cosmeticRepository.exportUnlockedFor(userId),
    cosmeticRepository.exportLoadoutFor(userId),
    qaRepository.exportUpvotesFor(userId),
    lessonQuizRepository.exportFor(userId),
    quizReportRepository.exportFor(userId),
    noteReportRepository.exportFor(userId),
    contentReportRepository.exportFor(userId),
    reviewCardRepository.exportFor(userId),
  ]);
  const { cards: reviewCards, sessions: reviewSessions } = review;

  return {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      format: "json",
      rgpdContext: "Article 20 RGPD - Droit à la portabilité",
      rights: `${siteUrl}/privacy#section-7`,
      limitations: {
        notifications: `Les ${String(NOTIFICATION_EXPORT_LIMIT)} notifications les plus récentes sont incluses.`,
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
      quizCorrect: p.quizCorrect,
      quizTotal: p.quizTotal,
    })),
    lessonQuizAnswers: lessonQuizAnswers.map((a) => ({
      lessonTitle: a.lesson.title,
      quizId: a.quizId,
      selected: a.selected,
      correct: a.correct,
      answeredAt: a.answeredAt,
    })),
    quizReports: quizReports.map((r) => ({
      lessonTitle: r.lesson.title,
      quizId: r.quizId,
      reason: r.reason,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
    })),
    noteReports: noteReports.map((r) => ({
      lessonTitle: r.note.lesson.title,
      reason: r.reason,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
    })),
    contentReports,
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
      downloadUrl: `${siteUrl}/api/certificates/${c.id}/download`,
      verifyUrl: `${siteUrl}/verify/${c.publicId}`,
      revokedAt: c.revokedAt,
      revokedReason: c.revokedReason,
    })),
    reviewSchedules,
    reviewCards: reviewCards.map((card) => ({
      lessonTitle: card.lesson.title,
      lessonSlug: card.lesson.slug,
      quizId: card.quizId,
      box: card.box,
      dueAt: card.dueAt,
      lapses: card.lapses,
      everCorrect: card.everCorrect,
      lastAnsweredAt: card.lastAnsweredAt,
      retiredAt: card.retiredAt,
      createdAt: card.createdAt,
    })),
    // A draw refers to its cards and lessons by internal id: the export names
    // the lesson as the session showed it instead, and pairs each question
    // with the option picked.
    reviewSessions: reviewSessions.map((session) => {
      const answers = readSessionAnswers(session.answers);
      return {
        day: session.day,
        questions: readDraw(session.draw).map((ref, index) => ({
          lessonTitle: ref.domain,
          quizId: ref.quizId,
          optionOrder: ref.order,
          selected: answers[String(index)] ?? null,
        })),
        completedAt: session.completedAt,
        xpCredited: session.xpCredited,
        createdAt: session.createdAt,
      };
    }),
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
    duels: duels.map((d) => ({
      pathTitle: d.path.title,
      role: d.challengerId === userId ? ("challenger" as const) : ("opponent" as const),
      status: d.status,
      won: d.status !== "FINISHED" ? null : d.winnerId === userId,
      createdAt: d.createdAt,
      finishedAt: d.finishedAt,
      answers: d.answers,
    })),
    tournamentSolves: tournamentSolves.map((t) => ({
      tournamentTitle: t.tournament.title,
      challengeTitle: t.challenge.title,
      points: t.points,
      solvedAt: t.solvedAt,
      disqualifiedAt: t.disqualifiedAt,
      disqualifiedReason: t.disqualifiedReason,
    })),
    mockExams: mockExams.map((e) => ({
      pathTitle: e.path.title,
      score: e.score,
      domains: e.domains,
      late: e.late,
      startedAt: e.startedAt,
      submittedAt: e.submittedAt,
    })),
    challengeWriteups: writeups.map((w) => ({
      challengeTitle: w.challenge.title,
      challengeSlug: w.challenge.slug,
      content: w.content,
      isHidden: w.isHidden,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
    contactTickets: tickets,
    notifications,
    skipWaivers: skipWaivers.map((w) => ({
      lessonTitle: w.lesson.title,
      lessonSlug: w.lesson.slug,
      grantedAt: w.grantedAt,
      grantReason: w.grantReason,
    })),
    notes: notes.map((n) => ({
      lessonTitle: n.lesson.title,
      folderName: n.folder?.name ?? null,
      content: n.content,
      wordCount: n.wordCount,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    noteFolders,
    quizAttempts: quizAttempts.map((a) => ({
      pathTitle: a.quiz.path.title,
      score: a.score,
      passed: a.passed,
      answers: a.answers,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    })),
    activityDays,
    questProgress,
    leagueMemberships,
    xpLedger,
    wrappedSnapshots,
    cosmeticsUnlocked,
    cosmeticLoadout,
    answerUpvotes,
  };
}
