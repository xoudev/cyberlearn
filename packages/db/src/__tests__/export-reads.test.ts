/**
 * The repositories' reads for the GDPR export (rgpd/build-export.ts): what
 * each asks of the database, and that what it gets back reaches the export
 * untouched.
 *
 * Each read is limited to the account's own rows - a filter dropped here
 * would put somebody else's data in a file the console or the account holder
 * downloads - and asks for the same columns and the same order as when the
 * export queried Prisma itself, since the file's format depends on them.
 * Prisma is mocked; the file built from these rows is in build-export.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { badgeRepository } from "../repositories/badge.repository.js";
import { banRepository } from "../repositories/ban.repository.js";
import { certificateRepository } from "../repositories/certificate.repository.js";
import { challengeRepository } from "../repositories/challenge.repository.js";
import { classRepository } from "../repositories/class.repository.js";
import { contentReportRepository } from "../repositories/content-report.repository.js";
import { cosmeticRepository } from "../repositories/cosmetic.repository.js";
import { duelRepository } from "../repositories/duel.repository.js";
import { exerciseRepository } from "../repositories/exercise.repository.js";
import { FORUM_EXPORT_LIMIT, forumRepository } from "../repositories/forum.repository.js";
import {
  FRIENDSHIP_EXPORT_LIMIT,
  friendshipRepository,
} from "../repositories/friendship.repository.js";
import { leagueRepository } from "../repositories/league.repository.js";
import { lessonProgressRepository } from "../repositories/lesson-progress.repository.js";
import { lessonQuizRepository } from "../repositories/lesson-quiz.repository.js";
import { mockExamRepository } from "../repositories/mock-exam.repository.js";
import {
  MODERATION_EXPORT_LIMIT,
  moderationRepository,
} from "../repositories/moderation.repository.js";
import { noteFolderRepository } from "../repositories/note-folder.repository.js";
import { noteReportRepository } from "../repositories/note-report.repository.js";
import { noteRepository } from "../repositories/note.repository.js";
import {
  notificationRepository,
  NOTIFICATION_EXPORT_LIMIT,
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
import { streakRepository } from "../repositories/streak.repository.js";
import { ticketRepository } from "../repositories/ticket.repository.js";
import { tournamentRepository } from "../repositories/tournament.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { wrappedRepository } from "../repositories/wrapped.repository.js";
import { writeupRepository } from "../repositories/writeup.repository.js";
import { xpLedgerRepository } from "../repositories/xp-ledger.repository.js";

const { mockPrisma } = vi.hoisted(() => {
  const read = (): { findMany: ReturnType<typeof vi.fn> } => ({ findMany: vi.fn() });
  const one = (): { findUnique: ReturnType<typeof vi.fn> } => ({ findUnique: vi.fn() });
  return {
    mockPrisma: {
      user: one(),
      userPreferences: one(),
      userPlacementResult: one(),
      userCosmeticLoadout: one(),
      userLessonProgress: read(),
      userPathProgress: read(),
      userChallengeProgress: read(),
      challengeHintReveal: read(),
      userBadge: read(),
      certificate: read(),
      rating: read(),
      lessonQuestion: read(),
      lessonAnswer: read(),
      lessonAnswerUpvote: read(),
      challengeWriteup: read(),
      mockExamAttempt: read(),
      duel: read(),
      tournamentSolve: read(),
      contactTicket: read(),
      notification: read(),
      userSkipWaiver: read(),
      note: read(),
      noteFolder: read(),
      quizAttempt: read(),
      userActivityDay: read(),
      userQuestProgress: read(),
      leagueMembership: read(),
      xpLedger: read(),
      wrappedSnapshot: read(),
      userCosmetic: read(),
      lessonQuizAnswer: read(),
      quizReport: read(),
      noteReport: read(),
      contentReport: read(),
      reviewCard: read(),
      reviewSession: read(),
      forumTopic: read(),
      forumPost: read(),
      friendship: read(),
      classMember: read(),
      exerciseCompletion: read(),
      userBan: read(),
      moderationEvent: read(),
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";

/**
 * Every column a query selects, as a dotted path, in the order its select
 * lists them. Prisma hands a row's keys back in that order, and several
 * sections of the export put the row in the file as it is, so a reordered
 * select reorders the downloaded JSON. `toHaveBeenCalledWith` compares
 * objects whatever their key order: this is what pins it.
 */
function selectedColumns(query: unknown, prefix = ""): string[] {
  if (typeof query !== "object" || query === null || !("select" in query)) return [];
  const { select } = query;
  if (typeof select !== "object" || select === null) return [];
  return Object.entries(select).flatMap(([key, value]: [string, unknown]) => [
    `${prefix}${key}`,
    ...selectedColumns(value, `${prefix}${key}.`),
  ]);
}

/** The query a mocked Prisma method received on its first call. */
function firstQuery(method: ReturnType<typeof vi.fn>): unknown {
  return method.mock.calls[0]?.[0];
}

interface ReadCase {
  /** How the export calls it. */
  name: string;
  read: (userId: string) => Promise<unknown>;
  /** The Prisma method it goes through. */
  prisma: ReturnType<typeof vi.fn>;
  /** The whole query, as Prisma receives it. */
  query: Record<string, unknown>;
}

const CASES: ReadCase[] = [
  {
    name: "userRepository.exportProfileFor",
    read: (id) => userRepository.exportProfileFor(id),
    prisma: mockPrisma.user.findUnique,
    query: {
      where: { id: USER },
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
    },
  },
  {
    name: "preferencesRepository.exportFor",
    read: (id) => preferencesRepository.exportFor(id),
    prisma: mockPrisma.userPreferences.findUnique,
    query: {
      where: { userId: USER },
      select: {
        theme: true,
        locale: true,
        emailNotifications: true,
        reviewReminders: true,
        weeklyDigest: true,
        publicProfile: true,
        learningGoals: true,
        startingLevel: true,
      },
    },
  },
  {
    name: "placementRepository.exportResultFor",
    read: (id) => placementRepository.exportResultFor(id),
    prisma: mockPrisma.userPlacementResult.findUnique,
    query: {
      where: { userId: USER },
      select: { devScore: true, cybersecScore: true, networkScore: true, completedAt: true },
    },
  },
  {
    name: "placementRepository.exportSkipWaiversFor",
    read: (id) => placementRepository.exportSkipWaiversFor(id),
    prisma: mockPrisma.userSkipWaiver.findMany,
    query: {
      where: { userId: USER },
      select: {
        grantedAt: true,
        grantReason: true,
        lesson: { select: { title: true, slug: true } },
      },
    },
  },
  {
    name: "lessonProgressRepository.exportFor",
    read: (id) => lessonProgressRepository.exportFor(id),
    prisma: mockPrisma.userLessonProgress.findMany,
    query: {
      where: { userId: USER },
      select: {
        status: true,
        attempts: true,
        bestScore: true,
        timeSpentSeconds: true,
        startedAt: true,
        completedAt: true,
        lastAccessedAt: true,
        quizCorrect: true,
        quizTotal: true,
        lesson: { select: { title: true, slug: true } },
      },
    },
  },
  {
    name: "pathRepository.exportProgressFor",
    read: (id) => pathRepository.exportProgressFor(id),
    prisma: mockPrisma.userPathProgress.findMany,
    query: {
      where: { userId: USER },
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
        path: { select: { title: true, slug: true } },
      },
    },
  },
  {
    name: "challengeRepository.exportProgressFor",
    read: (id) => challengeRepository.exportProgressFor(id),
    prisma: mockPrisma.userChallengeProgress.findMany,
    query: {
      where: { userId: USER },
      select: {
        status: true,
        attempts: true,
        startedAt: true,
        completedAt: true,
        challenge: { select: { title: true, slug: true } },
      },
    },
  },
  {
    name: "challengeRepository.exportHintRevealsFor",
    read: (id) => challengeRepository.exportHintRevealsFor(id),
    prisma: mockPrisma.challengeHintReveal.findMany,
    query: { where: { userId: USER }, select: { hintId: true, revealedAt: true } },
  },
  {
    name: "badgeRepository.exportFor",
    read: (id) => badgeRepository.exportFor(id),
    prisma: mockPrisma.userBadge.findMany,
    query: {
      where: { userId: USER },
      select: {
        earnedAt: true,
        context: true,
        badge: { select: { name: true, rarity: true, description: true } },
      },
    },
  },
  {
    name: "certificateRepository.exportFor",
    read: (id) => certificateRepository.exportFor(id),
    prisma: mockPrisma.certificate.findMany,
    query: {
      where: { userId: USER },
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
    },
  },
  {
    name: "ratingRepository.exportFor",
    read: (id) => ratingRepository.exportFor(id),
    prisma: mockPrisma.rating.findMany,
    query: {
      where: { userId: USER },
      select: {
        score: true,
        feedback: true,
        createdAt: true,
        lesson: { select: { title: true } },
        path: { select: { title: true } },
      },
    },
  },
  {
    name: "qaRepository.exportQuestionsFor",
    read: (id) => qaRepository.exportQuestionsFor(id),
    prisma: mockPrisma.lessonQuestion.findMany,
    query: {
      where: { userId: USER },
      select: {
        title: true,
        content: true,
        isResolved: true,
        createdAt: true,
        lesson: { select: { title: true, slug: true } },
      },
    },
  },
  {
    name: "qaRepository.exportAnswersFor",
    read: (id) => qaRepository.exportAnswersFor(id),
    prisma: mockPrisma.lessonAnswer.findMany,
    query: {
      where: { userId: USER },
      select: {
        content: true,
        isAccepted: true,
        upvotes: true,
        createdAt: true,
        question: { select: { id: true, title: true } },
      },
    },
  },
  {
    name: "qaRepository.exportUpvotesFor",
    read: (id) => qaRepository.exportUpvotesFor(id),
    prisma: mockPrisma.lessonAnswerUpvote.findMany,
    query: { where: { userId: USER }, select: { answerId: true, createdAt: true } },
  },
  {
    name: "writeupRepository.exportFor",
    read: (id) => writeupRepository.exportFor(id),
    prisma: mockPrisma.challengeWriteup.findMany,
    query: {
      where: { userId: USER },
      select: {
        content: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
        challenge: { select: { title: true, slug: true } },
      },
    },
  },
  {
    name: "mockExamRepository.exportFor",
    read: (id) => mockExamRepository.exportFor(id),
    prisma: mockPrisma.mockExamAttempt.findMany,
    query: {
      where: { userId: USER },
      select: {
        score: true,
        domains: true,
        late: true,
        startedAt: true,
        submittedAt: true,
        path: { select: { title: true } },
      },
    },
  },
  {
    name: "duelRepository.exportFor",
    read: (id) => duelRepository.exportFor(id),
    prisma: mockPrisma.duel.findMany,
    query: {
      where: { OR: [{ challengerId: USER }, { opponentId: USER }] },
      select: {
        challengerId: true,
        status: true,
        winnerId: true,
        createdAt: true,
        finishedAt: true,
        path: { select: { title: true } },
        // The other player's answers are theirs.
        answers: {
          where: { userId: USER },
          select: { index: true, selected: true, correct: true, answeredAt: true },
        },
      },
    },
  },
  {
    name: "tournamentRepository.exportSolvesFor",
    read: (id) => tournamentRepository.exportSolvesFor(id),
    prisma: mockPrisma.tournamentSolve.findMany,
    query: {
      where: { userId: USER },
      orderBy: { solvedAt: "asc" },
      select: {
        points: true,
        solvedAt: true,
        disqualifiedAt: true,
        disqualifiedReason: true,
        tournament: { select: { title: true } },
        challenge: { select: { title: true } },
      },
    },
  },
  {
    name: "ticketRepository.exportFor",
    read: (id) => ticketRepository.exportFor(id),
    prisma: mockPrisma.contactTicket.findMany,
    query: {
      where: { userId: USER },
      select: {
        subject: true,
        theme: true,
        message: true,
        status: true,
        jiraIssueKey: true,
        createdAt: true,
      },
    },
  },
  {
    name: "notificationRepository.exportFor",
    read: (id) => notificationRepository.exportFor(id),
    prisma: mockPrisma.notification.findMany,
    query: {
      where: { userId: USER },
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
    },
  },
  {
    name: "noteRepository.exportFor",
    read: (id) => noteRepository.exportFor(id),
    prisma: mockPrisma.note.findMany,
    query: {
      where: { userId: USER },
      select: {
        content: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
        lesson: { select: { title: true } },
        folder: { select: { name: true } },
      },
    },
  },
  {
    name: "noteFolderRepository.exportFor",
    read: (id) => noteFolderRepository.exportFor(id),
    prisma: mockPrisma.noteFolder.findMany,
    query: { where: { userId: USER }, select: { name: true, color: true, createdAt: true } },
  },
  {
    name: "quizRepository.exportAttemptsFor",
    read: (id) => quizRepository.exportAttemptsFor(id),
    prisma: mockPrisma.quizAttempt.findMany,
    query: {
      where: { userId: USER },
      select: {
        score: true,
        passed: true,
        answers: true,
        startedAt: true,
        submittedAt: true,
        quiz: { select: { path: { select: { title: true } } } },
      },
    },
  },
  {
    name: "streakRepository.exportActivityDaysFor",
    read: (id) => streakRepository.exportActivityDaysFor(id),
    prisma: mockPrisma.userActivityDay.findMany,
    query: {
      where: { userId: USER },
      select: { day: true, count: true },
      orderBy: { day: "desc" },
    },
  },
  {
    name: "questRepository.exportProgressFor",
    read: (id) => questRepository.exportProgressFor(id),
    prisma: mockPrisma.userQuestProgress.findMany,
    query: {
      where: { userId: USER },
      select: {
        weekKey: true,
        progress: true,
        completed: true,
        claimed: true,
        completedAt: true,
      },
    },
  },
  {
    name: "leagueRepository.exportMembershipsFor",
    read: (id) => leagueRepository.exportMembershipsFor(id),
    prisma: mockPrisma.leagueMembership.findMany,
    query: {
      where: { userId: USER },
      select: {
        division: true,
        seasonXp: true,
        finalRank: true,
        globalRank: true,
        joinedAt: true,
      },
    },
  },
  {
    name: "xpLedgerRepository.exportFor",
    read: (id) => xpLedgerRepository.exportFor(id),
    prisma: mockPrisma.xpLedger.findMany,
    query: {
      where: { userId: USER },
      select: { amount: true, source: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    },
  },
  {
    name: "wrappedRepository.exportFor",
    read: (id) => wrappedRepository.exportFor(id),
    prisma: mockPrisma.wrappedSnapshot.findMany,
    query: {
      where: { userId: USER },
      select: { period: true, periodKey: true, payload: true, createdAt: true },
    },
  },
  {
    name: "cosmeticRepository.exportUnlockedFor",
    read: (id) => cosmeticRepository.exportUnlockedFor(id),
    prisma: mockPrisma.userCosmetic.findMany,
    query: { where: { userId: USER }, select: { cosmeticId: true, unlockedAt: true } },
  },
  {
    name: "cosmeticRepository.exportLoadoutFor",
    read: (id) => cosmeticRepository.exportLoadoutFor(id),
    prisma: mockPrisma.userCosmeticLoadout.findUnique,
    query: {
      where: { userId: USER },
      select: {
        terminalTheme: true,
        hexagonStyle: true,
        profileFrame: true,
        accentColor: true,
      },
    },
  },
  {
    name: "lessonQuizRepository.exportFor",
    read: (id) => lessonQuizRepository.exportFor(id),
    prisma: mockPrisma.lessonQuizAnswer.findMany,
    query: {
      where: { userId: USER },
      select: {
        quizId: true,
        selected: true,
        correct: true,
        answeredAt: true,
        lesson: { select: { title: true } },
      },
      orderBy: { answeredAt: "asc" },
    },
  },
  {
    name: "quizReportRepository.exportFor",
    read: (id) => quizReportRepository.exportFor(id),
    prisma: mockPrisma.quizReport.findMany,
    query: {
      where: { userId: USER },
      select: {
        quizId: true,
        reason: true,
        comment: true,
        status: true,
        createdAt: true,
        lesson: { select: { title: true } },
      },
      orderBy: { createdAt: "asc" },
    },
  },
  {
    name: "noteReportRepository.exportFor",
    read: (id) => noteReportRepository.exportFor(id),
    prisma: mockPrisma.noteReport.findMany,
    query: {
      // The reports the account made, not those on its own notes.
      where: { reporterId: USER },
      select: {
        reason: true,
        comment: true,
        status: true,
        createdAt: true,
        note: { select: { lesson: { select: { title: true } } } },
      },
      orderBy: { createdAt: "asc" },
    },
  },
  {
    name: "contentReportRepository.exportFor",
    read: (id) => contentReportRepository.exportFor(id),
    prisma: mockPrisma.contentReport.findMany,
    query: {
      where: { reporterId: USER },
      select: {
        surface: true,
        contentId: true,
        reason: true,
        comment: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    },
  },
  {
    name: "forumRepository.exportTopicsFor",
    read: (id) => forumRepository.exportTopicsFor(id),
    prisma: mockPrisma.forumTopic.findMany,
    query: {
      // The threads the account opened, not those it replied in.
      where: { authorId: USER },
      select: {
        title: true,
        isHidden: true,
        lockedAt: true,
        createdAt: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: FORUM_EXPORT_LIMIT,
    },
  },
  {
    name: "forumRepository.exportPostsFor",
    read: (id) => forumRepository.exportPostsFor(id),
    prisma: mockPrisma.forumPost.findMany,
    query: {
      // The account's own messages: no filter on isHidden, a withdrawn one is held.
      where: { authorId: USER },
      select: {
        content: true,
        isHidden: true,
        hiddenByModeration: true,
        editedAt: true,
        createdAt: true,
        topic: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: FORUM_EXPORT_LIMIT,
    },
  },
  {
    name: "friendshipRepository.exportFor",
    read: (id) => friendshipRepository.exportFor(id),
    prisma: mockPrisma.friendship.findMany,
    query: {
      where: { OR: [{ userAId: USER }, { userBId: USER }] },
      // The other person is a username: no e-mail, no name, no level.
      select: {
        userAId: true,
        requestedById: true,
        status: true,
        createdAt: true,
        respondedAt: true,
        userA: { select: { username: true } },
        userB: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: FRIENDSHIP_EXPORT_LIMIT,
    },
  },
  {
    name: "classRepository.exportMembershipsFor",
    read: (id) => classRepository.exportMembershipsFor(id),
    prisma: mockPrisma.classMember.findMany,
    query: {
      // No LIVE_CLASS_FILTER: an archived class is still held.
      where: { userId: USER },
      select: {
        joinedAt: true,
        class: {
          select: {
            name: true,
            promotion: {
              select: { name: true, establishment: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    },
  },
  {
    name: "exerciseRepository.exportFor",
    read: (id) => exerciseRepository.exportFor(id),
    prisma: mockPrisma.exerciseCompletion.findMany,
    query: {
      where: { userId: USER },
      select: {
        exerciseId: true,
        kind: true,
        completedAt: true,
        lesson: { select: { title: true, slug: true } },
      },
      orderBy: { completedAt: "asc" },
    },
  },
  {
    name: "banRepository.exportFor",
    read: (id) => banRepository.exportFor(id),
    prisma: mockPrisma.userBan.findMany,
    query: {
      // Lifted bans included; neither who issued or lifted one nor why.
      where: { userId: USER },
      select: {
        reason: true,
        createdAt: true,
        expiresAt: true,
        liftedAt: true,
        acknowledgedAt: true,
        appealTicketId: true,
      },
      orderBy: { createdAt: "asc" },
    },
  },
  {
    name: "moderationRepository.exportFor",
    read: (id) => moderationRepository.exportFor(id),
    prisma: mockPrisma.moderationEvent.findMany,
    query: {
      // What findForUser shows the person: not the score, not the rules, not the reviewer.
      where: { userId: USER },
      select: {
        surface: true,
        verdict: true,
        excerpt: true,
        outcome: true,
        createdAt: true,
        reviewedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MODERATION_EXPORT_LIMIT,
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the repositories' reads for the GDPR export", () => {
  it.each(CASES.map((c): [string, ReadCase] => [c.name, c]))(
    "%s asks for the account's own rows",
    async (name, { read, prisma, query }) => {
      const rows = [{ marker: name }];
      prisma.mockResolvedValueOnce(rows);

      const result = await read(USER);

      expect(prisma).toHaveBeenCalledOnce();
      expect(prisma).toHaveBeenCalledWith(query);
      // The same columns in the same order, not only the same set.
      expect(selectedColumns(firstQuery(prisma))).toEqual(selectedColumns(query));
      expect(result).toBe(rows);
    },
  );

  it("tells two selects of the same columns in another order apart", () => {
    const listed = { select: { day: true, lesson: { select: { title: true, slug: true } } } };
    const reordered = { select: { lesson: { select: { slug: true, title: true } }, day: true } };

    expect(reordered).toEqual(listed);
    expect(selectedColumns(listed)).toEqual(["day", "lesson", "lesson.title", "lesson.slug"]);
    expect(selectedColumns(reordered)).not.toEqual(selectedColumns(listed));
  });

  it("covers every read the export makes through these repositories", () => {
    // The 44 reads of build-export.ts: these 41, the two of
    // reviewCardRepository.exportFor below, and the retired SM-2 queue's
    // (review-schedule-legacy.test.ts).
    expect(new Set(CASES.map((c) => c.prisma)).size).toBe(41);
  });

  it("lists as many notifications as the export says it does", () => {
    expect(NOTIFICATION_EXPORT_LIMIT).toBe(1000);
  });

  it("cuts the free-text and open-ended sections, and says where", () => {
    // build-export.ts words these numbers in the file's metadata.
    expect(FORUM_EXPORT_LIMIT).toBe(1000);
    expect(FRIENDSHIP_EXPORT_LIMIT).toBe(1000);
    expect(MODERATION_EXPORT_LIMIT).toBe(1000);
  });
});

describe("reviewCardRepository.exportFor", () => {
  it("reads the account's cards and sessions, oldest first, and hands both back", async () => {
    const cards = [{ quizId: "osi-q1" }];
    const sessions = [{ day: new Date("2026-10-17T00:00:00.000Z") }];
    mockPrisma.reviewCard.findMany.mockResolvedValueOnce(cards);
    mockPrisma.reviewSession.findMany.mockResolvedValueOnce(sessions);

    const result = await reviewCardRepository.exportFor(USER);

    expect(result).toEqual({ cards, sessions });
    expect(result.cards).toBe(cards);
    expect(result.sessions).toBe(sessions);
    // Retired cards and those of an archived lesson included: no status filter.
    expect(mockPrisma.reviewCard.findMany).toHaveBeenCalledWith({
      where: { userId: USER },
      select: {
        quizId: true,
        box: true,
        dueAt: true,
        lapses: true,
        everCorrect: true,
        lastAnsweredAt: true,
        retiredAt: true,
        createdAt: true,
        lesson: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(mockPrisma.reviewSession.findMany).toHaveBeenCalledWith({
      where: { userId: USER },
      select: {
        day: true,
        draw: true,
        answers: true,
        completedAt: true,
        xpCredited: true,
        createdAt: true,
      },
      orderBy: { day: "asc" },
    });
  });
});
