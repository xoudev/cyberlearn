// @cyberlearn/db
// Prisma client, Supabase client factories, repositories, and database types.

export { prisma } from "./prisma.js";
export { lessonRepository } from "./repositories/lesson.repository.js";
export { statsRepository } from "./repositories/stats.repository.js";
export type { LandingStats } from "./repositories/stats.repository.js";
export type { LessonFilters } from "./repositories/lesson.repository.js";
export { badgeRepository } from "./repositories/badge.repository.js";
export { userRepository } from "./repositories/user.repository.js";
export { pathRepository } from "./repositories/path.repository.js";
export { certificateRepository } from "./repositories/certificate.repository.js";
export type { CreateCertificateInput } from "./repositories/certificate.repository.js";
export { ratingRepository } from "./repositories/rating.repository.js";
export { qaRepository } from "./repositories/qa.repository.js";
export { notificationRepository } from "./repositories/notification.repository.js";
export type { NotificationItem } from "./repositories/notification.repository.js";
export { leaderboardRepository } from "./repositories/leaderboard.repository.js";
export type {
  LeaderboardEntry,
  CurrentUserPosition,
} from "./repositories/leaderboard.repository.js";
export { challengeRepository } from "./repositories/challenge.repository.js";
export type { ChallengeWithProgress } from "./repositories/challenge.repository.js";
export { quizRepository } from "./repositories/quiz.repository.js";
export type {
  QuizOption,
  DrawableQuestion,
  ScorableQuestion,
} from "./repositories/quiz.repository.js";
export { createSupabaseServerClient } from "./supabase/server.js";
export { createSupabaseBrowserClient } from "./supabase/client.js";
export { createSupabaseAdminClient } from "./supabase/admin.js";

// Re-export Prisma generated types for use across the monorepo
// (Prisma namespace gives consumers Prisma.TransactionClient & co.)
export type { Prisma } from "@prisma/client";
export type {
  User,
  UserPreferences,
  UserBadge,
  UserLessonProgress,
  UserPathProgress,
  UserPlacementResult,
  UserSkipWaiver,
  Lesson,
  LessonPrerequisite,
  Path,
  PathLesson,
  Badge,
  Rating,
  LessonQuestion,
  LessonAnswer,
  Certificate,
  Notification,
  ReviewSchedule,
  ContactTicket,
  AuditLog,
  PlacementQuestion,
  Challenge,
  UserChallengeProgress,
  ChallengeHint,
  ChallengeHintReveal,
  Quiz,
  QuizQuestion,
  QuizAttempt,
} from "@prisma/client";

export {
  UserRole,
  LeaderboardVisibility,
  Category,
  Difficulty,
  ContentStatus,
  BadgeRarity,
  BadgeCriterionType,
  ProgressStatus,
  NotificationType,
  TicketTheme,
  TicketStatus,
  ChallengeType,
} from "@prisma/client";
