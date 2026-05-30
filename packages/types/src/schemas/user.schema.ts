import { z } from "zod";

// ─── Username ──────────────────────────────────────────────────────────────

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/,
    "Username may only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen",
  );

// ─── Onboarding ────────────────────────────────────────────────────────────

export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(64, "Display name must be at most 64 characters"),
  bio: z.string().trim().max(280, "Bio must be at most 280 characters").optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ─── Profile update ────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(64).optional(),
  bio: z.string().trim().max(280, "Bio must be at most 280 characters").optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── User preferences update ───────────────────────────────────────────────

export const updatePreferencesSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  locale: z.enum(["fr", "en"]).optional(),
  emailNotifications: z.boolean().optional(),
  reviewReminders: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// ─── Privacy update ──────────────────────────────────────────────────────────

// Mirrors the Prisma `LeaderboardVisibility` enum (packages/db). Declared as a
// literal union here so packages/types stays decoupled from the Prisma client.
export const leaderboardVisibilitySchema = z.enum(["HIDDEN", "ANONYMOUS", "PUBLIC"]);

export type LeaderboardVisibilityInput = z.infer<typeof leaderboardVisibilitySchema>;

// Both fields required: the Privacy section submits its full state on save.
export const updatePrivacySchema = z.object({
  leaderboardVisibility: leaderboardVisibilitySchema,
  publicProfile: z.boolean(),
});

export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;

// ─── Settings profile update ──────────────────────────────────────────────────

// Built-in avatar SVGs (served from /public/avatars). Avatar uploads are not
// supported yet, so the avatar must be one of these known paths — validated
// server-side, never trusting an arbitrary client string.
export const AVATAR_PATHS = [
  "/avatars/av-1.svg",
  "/avatars/av-2.svg",
  "/avatars/av-3.svg",
  "/avatars/av-4.svg",
  "/avatars/av-5.svg",
  "/avatars/av-6.svg",
  "/avatars/av-7.svg",
  "/avatars/av-8.svg",
] as const;

export const settingsProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(64, "Display name must be at most 64 characters"),
  bio: z.string().trim().max(280, "Bio must be at most 280 characters").optional(),
  avatarUrl: z.enum(AVATAR_PATHS),
});

export type SettingsProfileInput = z.infer<typeof settingsProfileSchema>;

// ─── Theme ─────────────────────────────────────────────────────────────────

export const themeSchema = z.enum(["dark", "light", "system"]);

export type ThemeInput = z.infer<typeof themeSchema>;

// ─── Notifications update ──────────────────────────────────────────────────

// Only the toggles that are actually wired today. streakReminder exists in the
// schema but is not exposed here (its cron + email are a post-launch feature).
export const updateNotificationsSchema = z.object({
  reviewReminders: z.boolean(),
  weeklyDigest: z.boolean(),
});

export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>;
