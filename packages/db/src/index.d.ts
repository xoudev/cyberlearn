export { prisma } from "./prisma.js";
export { lessonRepository } from "./repositories/lesson.repository.js";
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
export type { LeaderboardEntry } from "./repositories/leaderboard.repository.js";
export { challengeRepository } from "./repositories/challenge.repository.js";
export type { ChallengeWithProgress } from "./repositories/challenge.repository.js";
export { createSupabaseServerClient } from "./supabase/server.js";
export { createSupabaseBrowserClient } from "./supabase/client.js";
export { createSupabaseAdminClient } from "./supabase/admin.js";
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
  LessonBadgeReward,
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
} from "@prisma/client";
export {
  UserRole,
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
//# sourceMappingURL=index.d.ts.map
