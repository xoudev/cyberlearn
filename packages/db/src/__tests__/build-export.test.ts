/**
 * The GDPR export's format: its sections, the keys of each row and their
 * order, as the JSON file the account holder downloads from the site and the
 * team downloads from the console.
 *
 * The file is read by people and by whatever they load it into, a year after
 * the last one sometimes: a section renamed, moved or dropped is a change of
 * format, never a refactor. The whole file is compared as the route writes it
 * (JSON.stringify, two spaces), so a key out of place fails here.
 *
 * Prisma is mocked with one account's rows; what each repository asks of the
 * database is in export-reads.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildExportPayload } from "../rgpd/build-export.js";

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
      reviewScheduleLegacy: read(),
      rating: read(),
      lessonQuestion: read(),
      lessonAnswer: read(),
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
      lessonAnswerUpvote: read(),
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
const OTHER = "22222222-2222-4222-8222-222222222222";
/** A friend whose id sorts before the account's: the pair stores the lower id first. */
const FRIEND = "00000000-0000-4000-8000-0000000000aa";
const SITE = "https://cyberlearn.fr";
const NOW = new Date("2026-10-18T12:00:00.000Z");

const d = (iso: string): Date => new Date(iso);

/** One account with a row, or two where the export decides something per row, in every table. */
function seed(): void {
  mockPrisma.user.findUnique.mockResolvedValue({
    email: "lea@exemple.fr",
    username: "lea",
    displayName: "Léa",
    avatarUrl: null,
    bio: "Je révise le réseau.",
    xpTotal: 1250,
    level: 4,
    streakDays: 3,
    lastActiveAt: d("2026-10-17T18:00:00.000Z"),
    createdAt: d("2026-01-02T09:00:00.000Z"),
  });
  mockPrisma.userPreferences.findUnique.mockResolvedValue({
    theme: "dark",
    locale: "fr",
    emailNotifications: true,
    reviewReminders: false,
    weeklyDigest: true,
    publicProfile: false,
    learningGoals: ["career"],
    startingLevel: "beginner",
  });
  mockPrisma.userPlacementResult.findUnique.mockResolvedValue({
    devScore: 40,
    cybersecScore: 70,
    networkScore: 55,
    completedAt: d("2026-01-02T09:30:00.000Z"),
  });
  mockPrisma.userLessonProgress.findMany.mockResolvedValue([
    {
      status: "COMPLETED",
      attempts: 2,
      bestScore: 90,
      timeSpentSeconds: 600,
      startedAt: d("2026-02-01T10:00:00.000Z"),
      completedAt: d("2026-02-01T10:10:00.000Z"),
      lastAccessedAt: d("2026-02-03T08:00:00.000Z"),
      quizCorrect: 4,
      quizTotal: 5,
      lesson: { title: "Le modèle OSI", slug: "modele-osi" },
    },
  ]);
  mockPrisma.userPathProgress.findMany.mockResolvedValue([
    {
      status: "IN_PROGRESS",
      startedAt: d("2026-02-01T09:59:00.000Z"),
      completedAt: null,
      path: { title: "Réseau", slug: "reseau" },
    },
  ]);
  mockPrisma.userChallengeProgress.findMany.mockResolvedValue([
    {
      status: "COMPLETED",
      attempts: 3,
      startedAt: d("2026-03-01T10:00:00.000Z"),
      completedAt: d("2026-03-01T11:00:00.000Z"),
      challenge: { title: "Port ouvert", slug: "port-ouvert" },
    },
  ]);
  mockPrisma.challengeHintReveal.findMany.mockResolvedValue([
    { hintId: "hint-1", revealedAt: d("2026-03-01T10:30:00.000Z") },
  ]);
  mockPrisma.userBadge.findMany.mockResolvedValue([
    {
      earnedAt: d("2026-02-01T10:10:00.000Z"),
      context: { lessonSlug: "modele-osi" },
      badge: { name: "Premier pas", rarity: "COMMON", description: "Une leçon terminée." },
    },
  ]);
  mockPrisma.certificate.findMany.mockResolvedValue([
    {
      id: "cert-row-id",
      publicId: "CL-2026-ABCD",
      issuedAt: d("2026-04-01T12:00:00.000Z"),
      expiresAt: null,
      sha256Hash: "f00d",
      revokedAt: null,
      revokedReason: null,
      path: { title: "Réseau" },
    },
  ]);
  mockPrisma.reviewScheduleLegacy.findMany.mockResolvedValue([
    {
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 2,
      nextReviewAt: d("2026-02-09T00:00:00.000Z"),
      lastReviewedAt: d("2026-02-03T00:00:00.000Z"),
      lesson: { title: "Le modèle OSI", slug: "modele-osi" },
    },
  ]);
  mockPrisma.rating.findMany.mockResolvedValue([
    {
      score: 5,
      feedback: "Clair.",
      createdAt: d("2026-02-01T10:11:00.000Z"),
      lesson: { title: "Le modèle OSI" },
      path: null,
    },
    {
      score: 4,
      feedback: null,
      createdAt: d("2026-04-01T12:01:00.000Z"),
      lesson: null,
      path: { title: "Réseau" },
    },
  ]);
  mockPrisma.lessonQuestion.findMany.mockResolvedValue([
    {
      title: "Couche 2 ?",
      content: "Pourquoi le switch est-il en couche 2 ?",
      isResolved: true,
      createdAt: d("2026-02-02T08:00:00.000Z"),
      lesson: { title: "Le modèle OSI", slug: "modele-osi" },
    },
  ]);
  mockPrisma.lessonAnswer.findMany.mockResolvedValue([
    {
      content: "Il lit les adresses MAC.",
      isAccepted: false,
      upvotes: 2,
      createdAt: d("2026-02-02T09:00:00.000Z"),
      question: { id: "question-1", title: "Et le routeur ?" },
    },
  ]);
  mockPrisma.challengeWriteup.findMany.mockResolvedValue([
    {
      content: "nmap puis netcat.",
      isHidden: false,
      createdAt: d("2026-03-01T11:05:00.000Z"),
      updatedAt: d("2026-03-02T11:05:00.000Z"),
      challenge: { title: "Port ouvert", slug: "port-ouvert" },
    },
  ]);
  mockPrisma.mockExamAttempt.findMany.mockResolvedValue([
    {
      score: 72,
      domains: [{ module: "Bases", score: 80 }],
      late: false,
      startedAt: d("2026-03-10T10:00:00.000Z"),
      submittedAt: d("2026-03-10T10:40:00.000Z"),
      path: { title: "Réseau" },
    },
  ]);
  mockPrisma.duel.findMany.mockResolvedValue([
    {
      challengerId: USER,
      status: "FINISHED",
      winnerId: USER,
      createdAt: d("2026-03-11T10:00:00.000Z"),
      finishedAt: d("2026-03-11T10:05:00.000Z"),
      path: { title: "Réseau" },
      answers: [
        { index: 0, selected: 1, correct: true, answeredAt: d("2026-03-11T10:01:00.000Z") },
      ],
    },
    {
      challengerId: OTHER,
      status: "PENDING",
      winnerId: null,
      createdAt: d("2026-03-12T10:00:00.000Z"),
      finishedAt: null,
      path: { title: "Réseau" },
      answers: [],
    },
  ]);
  mockPrisma.tournamentSolve.findMany.mockResolvedValue([
    {
      points: 300,
      solvedAt: d("2026-05-01T20:00:00.000Z"),
      disqualifiedAt: null,
      disqualifiedReason: null,
      tournament: { title: "CTF de printemps" },
      challenge: { title: "Port ouvert" },
    },
  ]);
  mockPrisma.contactTicket.findMany.mockResolvedValue([
    {
      subject: "Certificat introuvable",
      theme: "CERTIFICATE",
      message: "Je ne trouve pas mon certificat.",
      status: "RESOLVED",
      jiraIssueKey: null,
      createdAt: d("2026-04-02T08:00:00.000Z"),
    },
  ]);
  mockPrisma.notification.findMany.mockResolvedValue([
    {
      type: "BADGE_EARNED",
      title: "Badge obtenu",
      body: "Premier pas",
      actionUrl: "/profile?tab=badges",
      scheduledFor: d("2026-02-01T10:10:00.000Z"),
      sentAt: d("2026-02-01T10:10:01.000Z"),
      readAt: null,
    },
  ]);
  mockPrisma.userSkipWaiver.findMany.mockResolvedValue([
    {
      grantedAt: d("2026-01-02T09:30:00.000Z"),
      grantReason: "placement_test",
      lesson: { title: "Les bases du terminal", slug: "bases-terminal" },
    },
  ]);
  mockPrisma.note.findMany.mockResolvedValue([
    {
      content: "OSI : 7 couches.",
      wordCount: 3,
      createdAt: d("2026-02-01T10:05:00.000Z"),
      updatedAt: d("2026-02-01T10:06:00.000Z"),
      lesson: { title: "Le modèle OSI" },
      folder: { name: "Réseau" },
    },
    {
      content: "À revoir.",
      wordCount: 2,
      createdAt: d("2026-02-04T10:05:00.000Z"),
      updatedAt: d("2026-02-04T10:05:00.000Z"),
      lesson: { title: "Le modèle OSI" },
      folder: null,
    },
  ]);
  mockPrisma.noteFolder.findMany.mockResolvedValue([
    { name: "Réseau", color: null, createdAt: d("2026-02-01T10:04:00.000Z") },
  ]);
  mockPrisma.quizAttempt.findMany.mockResolvedValue([
    {
      score: 85,
      passed: true,
      answers: { q1: 2 },
      startedAt: d("2026-04-01T11:00:00.000Z"),
      submittedAt: d("2026-04-01T11:30:00.000Z"),
      quiz: { path: { title: "Réseau" } },
    },
  ]);
  mockPrisma.userActivityDay.findMany.mockResolvedValue([
    { day: d("2026-10-17T00:00:00.000Z"), count: 2 },
  ]);
  mockPrisma.userQuestProgress.findMany.mockResolvedValue([
    { weekKey: "2026-W42", progress: 2, completed: false, claimed: false, completedAt: null },
  ]);
  mockPrisma.leagueMembership.findMany.mockResolvedValue([
    {
      division: "BRONZE",
      seasonXp: 120,
      finalRank: null,
      globalRank: null,
      joinedAt: d("2026-10-01T00:00:00.000Z"),
    },
  ]);
  mockPrisma.xpLedger.findMany.mockResolvedValue([
    { amount: 50, source: "LESSON", createdAt: d("2026-02-01T10:10:00.000Z") },
  ]);
  mockPrisma.wrappedSnapshot.findMany.mockResolvedValue([
    {
      period: "MONTH",
      periodKey: "2026-09",
      payload: { lessons: 4 },
      createdAt: d("2026-10-01T03:00:00.000Z"),
    },
  ]);
  mockPrisma.userCosmetic.findMany.mockResolvedValue([
    { cosmeticId: "theme-matrix", unlockedAt: d("2026-05-01T20:01:00.000Z") },
  ]);
  mockPrisma.userCosmeticLoadout.findUnique.mockResolvedValue({
    terminalTheme: "theme-matrix",
    hexagonStyle: null,
    profileFrame: null,
    accentColor: null,
  });
  mockPrisma.lessonAnswerUpvote.findMany.mockResolvedValue([
    { answerId: "answer-9", createdAt: d("2026-02-02T09:30:00.000Z") },
  ]);
  mockPrisma.lessonQuizAnswer.findMany.mockResolvedValue([
    {
      quizId: "osi-q1",
      selected: 2,
      correct: true,
      answeredAt: d("2026-02-01T10:03:00.000Z"),
      lesson: { title: "Le modèle OSI" },
    },
  ]);
  mockPrisma.quizReport.findMany.mockResolvedValue([
    {
      quizId: "osi-q2",
      reason: "WRONG_ANSWER",
      comment: "La réponse B est juste aussi.",
      status: "OPEN",
      createdAt: d("2026-02-01T10:04:00.000Z"),
      lesson: { title: "Le modèle OSI" },
    },
  ]);
  mockPrisma.noteReport.findMany.mockResolvedValue([
    {
      reason: "SPAM",
      comment: null,
      status: "DISMISSED",
      createdAt: d("2026-02-05T10:00:00.000Z"),
      note: { lesson: { title: "Le modèle OSI" } },
    },
  ]);
  mockPrisma.contentReport.findMany.mockResolvedValue([
    {
      surface: "FORUM_POST",
      contentId: "post-3",
      reason: "ABUSE",
      comment: "Insultant.",
      status: "OPEN",
      createdAt: d("2026-06-01T10:00:00.000Z"),
    },
  ]);
  mockPrisma.reviewCard.findMany.mockResolvedValue([
    {
      quizId: "osi-q1",
      box: 2,
      dueAt: d("2026-10-20T00:00:00.000Z"),
      lapses: 1,
      everCorrect: true,
      lastAnsweredAt: d("2026-10-17T18:00:00.000Z"),
      retiredAt: null,
      createdAt: d("2026-10-11T10:00:00.000Z"),
      lesson: { title: "Le modèle OSI", slug: "modele-osi" },
    },
  ]);
  mockPrisma.reviewSession.findMany.mockResolvedValue([
    {
      day: d("2026-10-17T00:00:00.000Z"),
      draw: [
        {
          cardId: "card-1",
          lessonId: "lesson-1",
          quizId: "osi-q1",
          domain: "Le modèle OSI",
          order: [2, 0, 1],
        },
        {
          cardId: "card-2",
          lessonId: "lesson-1",
          quizId: "osi-q3",
          domain: "Le modèle OSI",
          order: [1, 0],
        },
      ],
      answers: { "0": 1 },
      completedAt: d("2026-10-17T18:00:00.000Z"),
      xpCredited: true,
      createdAt: d("2026-10-17T17:58:00.000Z"),
    },
  ]);
  mockPrisma.forumTopic.findMany.mockResolvedValue([
    {
      title: "Comment lire une capture Wireshark ?",
      isHidden: false,
      lockedAt: d("2026-09-02T08:00:00.000Z"),
      createdAt: d("2026-09-01T10:00:00.000Z"),
      category: { name: "Réseau" },
    },
  ]);
  mockPrisma.forumPost.findMany.mockResolvedValue([
    {
      content: "Merci, c'était le filtre de capture.",
      isHidden: false,
      hiddenByModeration: false,
      editedAt: d("2026-09-01T12:30:00.000Z"),
      createdAt: d("2026-09-01T12:00:00.000Z"),
      topic: { title: "Comment lire une capture Wireshark ?" },
    },
    {
      content: "Message retiré par son auteur.",
      isHidden: true,
      hiddenByModeration: false,
      editedAt: null,
      createdAt: d("2026-09-01T10:00:00.000Z"),
      topic: { title: "Comment lire une capture Wireshark ?" },
    },
  ]);
  // The rows carry more than the export keeps (an e-mail, a display name):
  // none of it may reach the file. The second friend asked first, from the
  // other side of the pair.
  mockPrisma.friendship.findMany.mockResolvedValue([
    {
      userAId: USER,
      requestedById: USER,
      status: "ACCEPTED",
      createdAt: d("2026-06-01T10:00:00.000Z"),
      respondedAt: d("2026-06-01T12:00:00.000Z"),
      userA: { username: "lea", email: "lea@exemple.fr" },
      userB: { username: "ines", email: "ines@exemple.fr", displayName: "Inès" },
    },
    {
      userAId: FRIEND,
      requestedById: FRIEND,
      status: "PENDING",
      createdAt: d("2026-05-01T10:00:00.000Z"),
      respondedAt: null,
      userA: { username: null, email: "samir@exemple.fr" },
      userB: { username: "lea", email: "lea@exemple.fr" },
    },
  ]);
  mockPrisma.classMember.findMany.mockResolvedValue([
    {
      joinedAt: d("2026-09-10T08:00:00.000Z"),
      class: {
        name: "SIO1-A",
        promotion: { name: "BTS SIO 1re année", establishment: { name: "Lycée Pasteur" } },
      },
    },
  ]);
  mockPrisma.exerciseCompletion.findMany.mockResolvedValue([
    {
      exerciseId: "ls-et-cd",
      kind: "TERMINAL",
      completedAt: d("2026-02-02T10:00:00.000Z"),
      lesson: { title: "Les bases du terminal", slug: "bases-terminal" },
    },
  ]);
  // The team's side of a ban is in the row here and must stay out of the file.
  mockPrisma.userBan.findMany.mockResolvedValue([
    {
      reason: "Propos injurieux sur le forum.",
      createdAt: d("2026-07-01T09:00:00.000Z"),
      expiresAt: d("2026-07-08T09:00:00.000Z"),
      liftedAt: d("2026-07-05T09:00:00.000Z"),
      acknowledgedAt: d("2026-07-01T09:05:00.000Z"),
      appealTicketId: "ticket-1",
      liftReason: "note interne de l'équipe",
      issuedById: "moderator-1",
    },
    {
      reason: "Partage d'un flag de tournoi.",
      createdAt: d("2026-08-01T09:00:00.000Z"),
      expiresAt: null,
      liftedAt: null,
      acknowledgedAt: null,
      appealTicketId: null,
      liftReason: null,
      issuedById: "moderator-1",
    },
  ]);
  mockPrisma.moderationEvent.findMany.mockResolvedValue([
    {
      surface: "forum.post",
      verdict: "REVIEW",
      excerpt: "Un extrait du message retenu.",
      outcome: "OVERTURNED",
      createdAt: d("2026-06-15T10:00:00.000Z"),
      reviewedAt: d("2026-06-15T14:00:00.000Z"),
      score: 8,
      findings: [{ rule: "insult" }],
      reviewedById: "moderator-1",
    },
  ]);
}

/** The file for the rows above, key by key in the order it is written. */
const EXPECTED = {
  exportMetadata: {
    exportedAt: "2026-10-18T12:00:00.000Z",
    version: "1.1",
    format: "json",
    rgpdContext: "Article 20 RGPD - Droit à la portabilité",
    rights: "https://cyberlearn.fr/privacy#section-7",
    limitations: {
      notifications: "Les 1000 notifications les plus récentes sont incluses.",
      forum:
        "Les 1000 sujets et les 1000 messages de forum les plus récents sont inclus, ceux qui ont été masqués compris.",
      friendships:
        "Les 1000 relations d'amitié les plus récentes sont incluses, demandes en attente comprises. Un ami y figure par son pseudo et les dates de la relation : son e-mail et ses autres données sont les siennes.",
      moderationEvents:
        "Les 1000 décisions du filtre automatique les plus récentes sont incluses, sans le score ni les règles qui les ont déclenchées.",
      sanctions:
        "Une sanction figure avec le motif qui a été montré à la personne. Qui l'a décidée ou levée, et pourquoi elle a été levée, restent à l'équipe.",
    },
  },
  profile: {
    email: "lea@exemple.fr",
    username: "lea",
    displayName: "Léa",
    avatarUrl: null,
    bio: "Je révise le réseau.",
    xpTotal: 1250,
    level: 4,
    streakDays: 3,
    lastActiveAt: "2026-10-17T18:00:00.000Z",
    createdAt: "2026-01-02T09:00:00.000Z",
  },
  preferences: {
    theme: "dark",
    locale: "fr",
    emailNotifications: true,
    reviewReminders: false,
    weeklyDigest: true,
    publicProfile: false,
    learningGoals: ["career"],
    startingLevel: "beginner",
  },
  placementTest: {
    devScore: 40,
    cybersecScore: 70,
    networkScore: 55,
    completedAt: "2026-01-02T09:30:00.000Z",
  },
  lessonsProgress: [
    {
      lessonTitle: "Le modèle OSI",
      lessonSlug: "modele-osi",
      status: "COMPLETED",
      attempts: 2,
      bestScore: 90,
      timeSpentSeconds: 600,
      startedAt: "2026-02-01T10:00:00.000Z",
      completedAt: "2026-02-01T10:10:00.000Z",
      lastAccessedAt: "2026-02-03T08:00:00.000Z",
      quizCorrect: 4,
      quizTotal: 5,
    },
  ],
  lessonQuizAnswers: [
    {
      lessonTitle: "Le modèle OSI",
      quizId: "osi-q1",
      selected: 2,
      correct: true,
      answeredAt: "2026-02-01T10:03:00.000Z",
    },
  ],
  quizReports: [
    {
      lessonTitle: "Le modèle OSI",
      quizId: "osi-q2",
      reason: "WRONG_ANSWER",
      comment: "La réponse B est juste aussi.",
      status: "OPEN",
      createdAt: "2026-02-01T10:04:00.000Z",
    },
  ],
  noteReports: [
    {
      lessonTitle: "Le modèle OSI",
      reason: "SPAM",
      comment: null,
      status: "DISMISSED",
      createdAt: "2026-02-05T10:00:00.000Z",
    },
  ],
  contentReports: [
    {
      surface: "FORUM_POST",
      contentId: "post-3",
      reason: "ABUSE",
      comment: "Insultant.",
      status: "OPEN",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
  ],
  pathsProgress: [
    {
      pathTitle: "Réseau",
      pathSlug: "reseau",
      status: "IN_PROGRESS",
      startedAt: "2026-02-01T09:59:00.000Z",
      completedAt: null,
    },
  ],
  challengesProgress: [
    {
      challengeTitle: "Port ouvert",
      challengeSlug: "port-ouvert",
      status: "COMPLETED",
      attempts: 3,
      startedAt: "2026-03-01T10:00:00.000Z",
      completedAt: "2026-03-01T11:00:00.000Z",
    },
  ],
  hintsRevealed: [{ hintId: "hint-1", revealedAt: "2026-03-01T10:30:00.000Z" }],
  badges: [
    {
      name: "Premier pas",
      rarity: "COMMON",
      description: "Une leçon terminée.",
      earnedAt: "2026-02-01T10:10:00.000Z",
      context: { lessonSlug: "modele-osi" },
    },
  ],
  certificates: [
    {
      publicId: "CL-2026-ABCD",
      pathTitle: "Réseau",
      issuedAt: "2026-04-01T12:00:00.000Z",
      expiresAt: null,
      sha256Hash: "f00d",
      downloadUrl: "https://cyberlearn.fr/api/certificates/cert-row-id/download",
      verifyUrl: "https://cyberlearn.fr/verify/CL-2026-ABCD",
      revokedAt: null,
      revokedReason: null,
    },
  ],
  reviewSchedules: [
    {
      lessonTitle: "Le modèle OSI",
      lessonSlug: "modele-osi",
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 2,
      nextReviewAt: "2026-02-09T00:00:00.000Z",
      lastReviewedAt: "2026-02-03T00:00:00.000Z",
    },
  ],
  reviewCards: [
    {
      lessonTitle: "Le modèle OSI",
      lessonSlug: "modele-osi",
      quizId: "osi-q1",
      box: 2,
      dueAt: "2026-10-20T00:00:00.000Z",
      lapses: 1,
      everCorrect: true,
      lastAnsweredAt: "2026-10-17T18:00:00.000Z",
      retiredAt: null,
      createdAt: "2026-10-11T10:00:00.000Z",
    },
  ],
  reviewSessions: [
    {
      day: "2026-10-17T00:00:00.000Z",
      questions: [
        { lessonTitle: "Le modèle OSI", quizId: "osi-q1", optionOrder: [2, 0, 1], selected: 1 },
        { lessonTitle: "Le modèle OSI", quizId: "osi-q3", optionOrder: [1, 0], selected: null },
      ],
      completedAt: "2026-10-17T18:00:00.000Z",
      xpCredited: true,
      createdAt: "2026-10-17T17:58:00.000Z",
    },
  ],
  ratings: [
    {
      contentTitle: "Le modèle OSI",
      contentType: "lesson",
      score: 5,
      feedback: "Clair.",
      createdAt: "2026-02-01T10:11:00.000Z",
    },
    {
      contentTitle: "Réseau",
      contentType: "path",
      score: 4,
      feedback: null,
      createdAt: "2026-04-01T12:01:00.000Z",
    },
  ],
  qaActivity: {
    questions: [
      {
        lessonTitle: "Le modèle OSI",
        lessonSlug: "modele-osi",
        title: "Couche 2 ?",
        content: "Pourquoi le switch est-il en couche 2 ?",
        isResolved: true,
        createdAt: "2026-02-02T08:00:00.000Z",
      },
    ],
    answers: [
      {
        questionId: "question-1",
        questionTitle: "Et le routeur ?",
        content: "Il lit les adresses MAC.",
        isAccepted: false,
        upvotes: 2,
        createdAt: "2026-02-02T09:00:00.000Z",
      },
    ],
  },
  duels: [
    {
      pathTitle: "Réseau",
      role: "challenger",
      status: "FINISHED",
      won: true,
      createdAt: "2026-03-11T10:00:00.000Z",
      finishedAt: "2026-03-11T10:05:00.000Z",
      answers: [{ index: 0, selected: 1, correct: true, answeredAt: "2026-03-11T10:01:00.000Z" }],
    },
    {
      pathTitle: "Réseau",
      role: "opponent",
      status: "PENDING",
      won: null,
      createdAt: "2026-03-12T10:00:00.000Z",
      finishedAt: null,
      answers: [],
    },
  ],
  tournamentSolves: [
    {
      tournamentTitle: "CTF de printemps",
      challengeTitle: "Port ouvert",
      points: 300,
      solvedAt: "2026-05-01T20:00:00.000Z",
      disqualifiedAt: null,
      disqualifiedReason: null,
    },
  ],
  mockExams: [
    {
      pathTitle: "Réseau",
      score: 72,
      domains: [{ module: "Bases", score: 80 }],
      late: false,
      startedAt: "2026-03-10T10:00:00.000Z",
      submittedAt: "2026-03-10T10:40:00.000Z",
    },
  ],
  challengeWriteups: [
    {
      challengeTitle: "Port ouvert",
      challengeSlug: "port-ouvert",
      content: "nmap puis netcat.",
      isHidden: false,
      createdAt: "2026-03-01T11:05:00.000Z",
      updatedAt: "2026-03-02T11:05:00.000Z",
    },
  ],
  contactTickets: [
    {
      subject: "Certificat introuvable",
      theme: "CERTIFICATE",
      message: "Je ne trouve pas mon certificat.",
      status: "RESOLVED",
      jiraIssueKey: null,
      createdAt: "2026-04-02T08:00:00.000Z",
    },
  ],
  notifications: [
    {
      type: "BADGE_EARNED",
      title: "Badge obtenu",
      body: "Premier pas",
      actionUrl: "/profile?tab=badges",
      scheduledFor: "2026-02-01T10:10:00.000Z",
      sentAt: "2026-02-01T10:10:01.000Z",
      readAt: null,
    },
  ],
  skipWaivers: [
    {
      lessonTitle: "Les bases du terminal",
      lessonSlug: "bases-terminal",
      grantedAt: "2026-01-02T09:30:00.000Z",
      grantReason: "placement_test",
    },
  ],
  notes: [
    {
      lessonTitle: "Le modèle OSI",
      folderName: "Réseau",
      content: "OSI : 7 couches.",
      wordCount: 3,
      createdAt: "2026-02-01T10:05:00.000Z",
      updatedAt: "2026-02-01T10:06:00.000Z",
    },
    {
      lessonTitle: "Le modèle OSI",
      folderName: null,
      content: "À revoir.",
      wordCount: 2,
      createdAt: "2026-02-04T10:05:00.000Z",
      updatedAt: "2026-02-04T10:05:00.000Z",
    },
  ],
  noteFolders: [{ name: "Réseau", color: null, createdAt: "2026-02-01T10:04:00.000Z" }],
  quizAttempts: [
    {
      pathTitle: "Réseau",
      score: 85,
      passed: true,
      answers: { q1: 2 },
      startedAt: "2026-04-01T11:00:00.000Z",
      submittedAt: "2026-04-01T11:30:00.000Z",
    },
  ],
  activityDays: [{ day: "2026-10-17T00:00:00.000Z", count: 2 }],
  questProgress: [
    { weekKey: "2026-W42", progress: 2, completed: false, claimed: false, completedAt: null },
  ],
  leagueMemberships: [
    {
      division: "BRONZE",
      seasonXp: 120,
      finalRank: null,
      globalRank: null,
      joinedAt: "2026-10-01T00:00:00.000Z",
    },
  ],
  xpLedger: [{ amount: 50, source: "LESSON", createdAt: "2026-02-01T10:10:00.000Z" }],
  wrappedSnapshots: [
    {
      period: "MONTH",
      periodKey: "2026-09",
      payload: { lessons: 4 },
      createdAt: "2026-10-01T03:00:00.000Z",
    },
  ],
  cosmeticsUnlocked: [{ cosmeticId: "theme-matrix", unlockedAt: "2026-05-01T20:01:00.000Z" }],
  cosmeticLoadout: {
    terminalTheme: "theme-matrix",
    hexagonStyle: null,
    profileFrame: null,
    accentColor: null,
  },
  answerUpvotes: [{ answerId: "answer-9", createdAt: "2026-02-02T09:30:00.000Z" }],
  forumTopics: [
    {
      categoryName: "Réseau",
      title: "Comment lire une capture Wireshark ?",
      isHidden: false,
      lockedAt: "2026-09-02T08:00:00.000Z",
      createdAt: "2026-09-01T10:00:00.000Z",
    },
  ],
  forumPosts: [
    {
      topicTitle: "Comment lire une capture Wireshark ?",
      content: "Merci, c'était le filtre de capture.",
      isHidden: false,
      hiddenByModeration: false,
      editedAt: "2026-09-01T12:30:00.000Z",
      createdAt: "2026-09-01T12:00:00.000Z",
    },
    {
      topicTitle: "Comment lire une capture Wireshark ?",
      content: "Message retiré par son auteur.",
      isHidden: true,
      hiddenByModeration: false,
      editedAt: null,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
  ],
  friendships: [
    {
      username: "ines",
      direction: "sent",
      status: "ACCEPTED",
      createdAt: "2026-06-01T10:00:00.000Z",
      respondedAt: "2026-06-01T12:00:00.000Z",
    },
    {
      username: null,
      direction: "received",
      status: "PENDING",
      createdAt: "2026-05-01T10:00:00.000Z",
      respondedAt: null,
    },
  ],
  classMemberships: [
    {
      className: "SIO1-A",
      promotionName: "BTS SIO 1re année",
      establishmentName: "Lycée Pasteur",
      joinedAt: "2026-09-10T08:00:00.000Z",
    },
  ],
  exerciseCompletions: [
    {
      lessonTitle: "Les bases du terminal",
      lessonSlug: "bases-terminal",
      exerciseId: "ls-et-cd",
      kind: "TERMINAL",
      completedAt: "2026-02-02T10:00:00.000Z",
    },
  ],
  bans: [
    {
      reason: "Propos injurieux sur le forum.",
      createdAt: "2026-07-01T09:00:00.000Z",
      expiresAt: "2026-07-08T09:00:00.000Z",
      liftedAt: "2026-07-05T09:00:00.000Z",
      acknowledgedAt: "2026-07-01T09:05:00.000Z",
      appealed: true,
    },
    {
      reason: "Partage d'un flag de tournoi.",
      createdAt: "2026-08-01T09:00:00.000Z",
      expiresAt: null,
      liftedAt: null,
      acknowledgedAt: null,
      appealed: false,
    },
  ],
  moderationEvents: [
    {
      surface: "forum.post",
      verdict: "REVIEW",
      excerpt: "Un extrait du message retenu.",
      outcome: "OVERTURNED",
      createdAt: "2026-06-15T10:00:00.000Z",
      reviewedAt: "2026-06-15T14:00:00.000Z",
    },
  ],
};

/** What the route sends. */
function asFile(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  seed();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildExportPayload", () => {
  it("writes the file key for key, in the order of its format", async () => {
    const payload = await buildExportPayload(USER, { siteUrl: SITE });

    expect(asFile(payload)).toBe(asFile(EXPECTED));
  });

  it("keeps its sections in their order", async () => {
    const payload = await buildExportPayload(USER, { siteUrl: SITE });

    expect(Object.keys(payload)).toEqual([
      "exportMetadata",
      "profile",
      "preferences",
      "placementTest",
      "lessonsProgress",
      "lessonQuizAnswers",
      "quizReports",
      "noteReports",
      "contentReports",
      "pathsProgress",
      "challengesProgress",
      "hintsRevealed",
      "badges",
      "certificates",
      "reviewSchedules",
      "reviewCards",
      "reviewSessions",
      "ratings",
      "qaActivity",
      "duels",
      "tournamentSolves",
      "mockExams",
      "challengeWriteups",
      "contactTickets",
      "notifications",
      "skipWaivers",
      "notes",
      "noteFolders",
      "quizAttempts",
      "activityDays",
      "questProgress",
      "leagueMemberships",
      "xpLedger",
      "wrappedSnapshots",
      "cosmeticsUnlocked",
      "cosmeticLoadout",
      "answerUpvotes",
      "forumTopics",
      "forumPosts",
      "friendships",
      "classMemberships",
      "exerciseCompletions",
      "bans",
      "moderationEvents",
    ]);
  });

  it("names a friend by username and dates, and nobody else's data", async () => {
    const payload = await buildExportPayload(USER, { siteUrl: SITE });
    const file = asFile(payload);

    // The pair's other side, whichever side the account is on.
    expect(payload.friendships.map((f) => f.username)).toEqual(["ines", null]);
    expect(Object.keys(payload.friendships[0] ?? {})).toEqual([
      "username",
      "direction",
      "status",
      "createdAt",
      "respondedAt",
    ]);
    // No e-mail, no display name, no id of either person.
    expect(file).not.toContain("ines@exemple.fr");
    expect(file).not.toContain("samir@exemple.fr");
    expect(file).not.toContain("Inès");
    expect(file).not.toContain(FRIEND);
  });

  it("keeps the team's side of a sanction and of the screen out of the file", async () => {
    const payload = await buildExportPayload(USER, { siteUrl: SITE });
    const file = asFile(payload);

    expect(file).not.toContain("note interne de l'équipe");
    expect(file).not.toContain("moderator-1");
    // The appeal ticket's id says there was an appeal and goes no further.
    expect(file).not.toContain("ticket-1");
    expect(payload.bans.map((b) => b.appealed)).toEqual([true, false]);
    expect(Object.keys(payload.moderationEvents[0] ?? {})).toEqual([
      "surface",
      "verdict",
      "excerpt",
      "outcome",
      "createdAt",
      "reviewedAt",
    ]);
  });

  it("says in its metadata what it cuts and what it leaves to the team", async () => {
    const { limitations } = (await buildExportPayload(USER, { siteUrl: SITE })).exportMetadata;

    expect(Object.keys(limitations)).toEqual([
      "notifications",
      "forum",
      "friendships",
      "moderationEvents",
      "sanctions",
    ]);
  });

  it("points the certificates and the rights at the site it is given", async () => {
    const payload = await buildExportPayload(USER, { siteUrl: "http://localhost:3000" });

    expect(payload.exportMetadata.rights).toBe("http://localhost:3000/privacy#section-7");
    expect(payload.certificates[0]).toMatchObject({
      downloadUrl: "http://localhost:3000/api/certificates/cert-row-id/download",
      verifyUrl: "http://localhost:3000/verify/CL-2026-ABCD",
    });
  });

  it("reads every table for the account it is asked about, and no other", async () => {
    await buildExportPayload(USER, { siteUrl: SITE });

    for (const [model, methods] of Object.entries(mockPrisma)) {
      for (const [method, fn] of Object.entries(methods)) {
        expect(fn, `${model}.${method}`).toHaveBeenCalledOnce();
        expect(JSON.stringify(fn.mock.calls[0]), `${model}.${method}`).toContain(USER);
        expect(JSON.stringify(fn.mock.calls[0]), `${model}.${method}`).not.toContain(OTHER);
      }
    }
  });

  it("gives an account that is gone an empty file rather than failing", async () => {
    for (const methods of Object.values(mockPrisma)) {
      for (const [method, fn] of Object.entries(methods)) {
        fn.mockResolvedValue(method === "findUnique" ? null : []);
      }
    }

    const payload = await buildExportPayload(USER, { siteUrl: SITE });

    expect(payload.profile).toBeNull();
    expect(payload.cosmeticLoadout).toBeNull();
    expect(payload.lessonsProgress).toEqual([]);
    expect(payload.qaActivity).toEqual({ questions: [], answers: [] });
    for (const section of [
      payload.forumTopics,
      payload.forumPosts,
      payload.friendships,
      payload.classMemberships,
      payload.exerciseCompletions,
      payload.bans,
      payload.moderationEvents,
    ]) {
      expect(section).toEqual([]);
    }
  });
});
