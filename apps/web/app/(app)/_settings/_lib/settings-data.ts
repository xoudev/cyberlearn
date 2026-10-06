import { z } from "zod";

/**
 * What each settings section shows, as plain data.
 *
 * The server reads it (_lib/load-settings.ts) and the drawer receives all
 * seven sections in one request (/api/me/settings). One shape, checked on
 * arrival, so the drawer never renders a payload it does not understand.
 *
 * Dates travel as ISO strings: the payload crosses the network as JSON.
 */

export const profileSectionSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  bio: z.string(),
  /** A built-in path, a glyph, or "__upload:<key>" for an uploaded photo. */
  avatarUrl: z.string(),
  /** The uploaded photo as a short-lived signed URL, for the preview. */
  avatarPreview: z.string().nullable(),
});

export const privacySectionSchema = z.object({
  visibility: z.enum(["HIDDEN", "ANONYMOUS", "PUBLIC"]),
  publicProfile: z.boolean(),
  friendsLeaderboard: z.boolean(),
});

export const preferencesSectionSchema = z.object({
  spacedRepetition: z.boolean(),
});

export const notificationsSectionSchema = z.object({
  reviewReminders: z.boolean(),
  weeklyDigest: z.boolean(),
  streakReminder: z.boolean(),
  emailNotifications: z.boolean(),
});

export const moderationSectionSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      surface: z.string(),
      excerpt: z.string(),
      outcome: z.string(),
      createdAt: z.string(),
      reviewedAt: z.string().nullable(),
    }),
  ),
});

export const accountSectionSchema = z.object({
  email: z.string().nullable(),
  emailConfirmed: z.boolean(),
});

export const dataSectionSchema = z.object({
  /** When a deletion link already sent stops working, if one is pending. */
  pendingExpiresAt: z.string().nullable(),
  certificateCount: z.number().int().nonnegative(),
});

export const settingsDataSchema = z.object({
  profile: profileSectionSchema,
  privacy: privacySectionSchema,
  preferences: preferencesSectionSchema,
  notifications: notificationsSectionSchema,
  moderation: moderationSectionSchema,
  account: accountSectionSchema,
  data: dataSectionSchema,
});

export type ProfileSectionData = z.infer<typeof profileSectionSchema>;
export type PrivacySectionData = z.infer<typeof privacySectionSchema>;
export type PreferencesSectionData = z.infer<typeof preferencesSectionSchema>;
export type NotificationsSectionData = z.infer<typeof notificationsSectionSchema>;
export type ModerationSectionData = z.infer<typeof moderationSectionSchema>;
export type AccountSectionData = z.infer<typeof accountSectionSchema>;
export type DataSectionData = z.infer<typeof dataSectionSchema>;
export type SettingsData = z.infer<typeof settingsDataSchema>;
