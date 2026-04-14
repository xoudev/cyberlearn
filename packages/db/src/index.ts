// @cyberlearn/db
// Prisma client, Supabase client factories, and database types.

export { prisma } from "./prisma.js";
export { createSupabaseServerClient } from "./supabase/server.js";
export { createSupabaseBrowserClient } from "./supabase/client.js";
export { createSupabaseAdminClient } from "./supabase/admin.js";

// Re-export Prisma generated types for use across the monorepo
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
} from "@prisma/client";
