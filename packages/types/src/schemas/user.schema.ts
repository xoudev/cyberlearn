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

// Every field required: the Privacy section submits its full state on save.
export const updatePrivacySchema = z.object({
  leaderboardVisibility: leaderboardVisibilitySchema,
  publicProfile: z.boolean(),
  // Separate from leaderboardVisibility on purpose: the public board and a
  // friends board are two audiences, and one says nothing about the other.
  friendsLeaderboard: z.boolean(),
});

export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;

// ─── Settings profile update ──────────────────────────────────────────────────

// Built-in avatar SVGs (served from /public/avatars). Avatar uploads are not
// supported yet, so the avatar must be one of these known paths - validated
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

// ─── Custom avatar upload ─────────────────────────────────────────────────────

// Uploaded avatars are stored in a PRIVATE Supabase Storage bucket and never
// exposed by a public URL. The User.avatarUrl column holds a marker of the form
// `__upload:<userId>/<uuid>.<ext>`; display sites resolve it to a short-lived
// signed URL server-side. This mirrors the existing `__glyph:` marker scheme so
// the value type stays a single string. See docs/adr/ADR-003.
export const UPLOADED_AVATAR_PREFIX = "__upload:";

// Raster formats only. SVG is intentionally excluded: an SVG can carry inline
// scripts and would be an XSS vector when served from our origin.
export const AVATAR_UPLOAD_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarUploadMime = (typeof AVATAR_UPLOAD_ALLOWED_MIME)[number];

export const AVATAR_UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// What a refused upload says, the same from the site's form and from the app.
export const AVATAR_UPLOAD_ERROR = {
  missing: "Aucun fichier reçu.",
  empty: "Fichier vide.",
  tooLarge: "Image trop lourde (2 Mo maximum).",
  format: "Format non supporté. Utilise JPEG, PNG ou WebP.",
  content: "Le contenu du fichier ne correspond pas à une image valide.",
  storage: "Échec de l'envoi de l'image. Réessaie.",
} as const;

// Maps an allowed MIME type to the file extension used in the storage key.
export const AVATAR_MIME_EXTENSION: Record<AvatarUploadMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** True when an avatar value points to a privately-stored uploaded image. */
export function isUploadedAvatar(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(UPLOADED_AVATAR_PREFIX);
}

/** Extracts the storage object key from an uploaded-avatar marker, or null. */
export function uploadedAvatarKey(value: string | null | undefined): string | null {
  return isUploadedAvatar(value) ? value.slice(UPLOADED_AVATAR_PREFIX.length) : null;
}

// ─── Theme ─────────────────────────────────────────────────────────────────

export const themeSchema = z.enum(["dark", "light", "system"]);

export type ThemeInput = z.infer<typeof themeSchema>;

// ─── Notifications update ──────────────────────────────────────────────────

// Only the toggles that are actually wired today. streakReminder exists in the
// schema but is not exposed here (its cron + email are a post-launch feature).
export const updateNotificationsSchema = z.object({
  reviewReminders: z.boolean(),
  weeklyDigest: z.boolean(),
  /** Moderation notices and class work by e-mail; optional for older forms. */
  emailNotifications: z.boolean().optional(),
});

export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>;
