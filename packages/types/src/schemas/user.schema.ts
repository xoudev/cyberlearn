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
