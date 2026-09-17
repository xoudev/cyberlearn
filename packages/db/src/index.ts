// @cyberlearn/db
// Prisma client, Supabase client factories, repositories, and database types.

export { prisma } from "./prisma.js";
export {
  moderationRepository,
  type ScreenInput,
  type ScreenResult,
} from "./repositories/moderation.repository.js";
export {
  lessonRepository,
  CATALOGUE_LESSON,
  lessonsVisibleTo,
} from "./repositories/lesson.repository.js";
export { statsRepository } from "./repositories/stats.repository.js";
export type {
  LandingStats,
  FeaturedPath,
  PublicCatalogPath,
} from "./repositories/stats.repository.js";
export type { LessonFilters } from "./repositories/lesson.repository.js";
export { badgeRepository } from "./repositories/badge.repository.js";
export { userRepository } from "./repositories/user.repository.js";
export { classRepository, LIVE_CLASS_FILTER } from "./repositories/class.repository.js";
export {
  deleteAccount,
  type DeleteAccountOptions,
  type DeletionSummary,
} from "./rgpd/delete-account.js";
export {
  forumRepository,
  slugify,
  POSTS_PER_PAGE,
  TOPICS_PER_PAGE,
  type ForumAuthor,
  type ForumCategorySummary,
  type ForumTopicSummary,
  type ForumTopicView,
  type ForumPostView,
} from "./repositories/forum.repository.js";
export { pathRepository } from "./repositories/path.repository.js";
export { certificateRepository } from "./repositories/certificate.repository.js";
export type { CreateCertificateInput } from "./repositories/certificate.repository.js";
export { ratingRepository } from "./repositories/rating.repository.js";
export { qaRepository } from "./repositories/qa.repository.js";
export { noteRepository, type NoteSummary } from "./repositories/note.repository.js";
export {
  noteShareRepository,
  type ShareCandidate,
  type ShareRecipient,
  type ShareResult,
  type IncomingNote,
} from "./repositories/note-share.repository.js";
export {
  noteFolderRepository,
  type NoteFolderSummary,
} from "./repositories/note-folder.repository.js";
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
export { questRepository } from "./repositories/quest.repository.js";
export type { QuestWithProgress } from "./repositories/quest.repository.js";
export { streakRepository } from "./repositories/streak.repository.js";
export type { StreakOverview } from "./repositories/streak.repository.js";
export { cosmeticRepository } from "./repositories/cosmetic.repository.js";
export type { CosmeticWithState, EquippedCodes } from "./repositories/cosmetic.repository.js";
export { leagueRepository } from "./repositories/league.repository.js";
export type { PodLadderEntry } from "./repositories/league.visibility.js";
export { wrappedRepository } from "./repositories/wrapped.repository.js";
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
  Note,
  NoteFolder,
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
  Quest,
  UserQuestProgress,
  Cosmetic,
  UserCosmetic,
  UserCosmeticLoadout,
  Season,
  LeagueMembership,
  XpLedger,
  WrappedSnapshot,
} from "@prisma/client";

export {
  UserRole,
  LeaderboardVisibility,
  Category,
  Difficulty,
  ContentStatus,
  LessonAudience,
  BadgeRarity,
  BadgeCriterionType,
  ProgressStatus,
  NotificationType,
  TicketTheme,
  TicketStatus,
  ChallengeType,
  QuestType,
  CosmeticType,
  SeasonStatus,
  LeagueDivision,
  XpSource,
  WrappedPeriod,
} from "@prisma/client";
