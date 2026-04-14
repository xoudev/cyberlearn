"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferencesSchema =
  exports.updateProfileSchema =
  exports.onboardingSchema =
  exports.usernameSchema =
    void 0;
const zod_1 = require("zod");
// ─── Username ──────────────────────────────────────────────────────────────
exports.usernameSchema = zod_1.z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/,
    "Username may only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen",
  );
// ─── Onboarding ────────────────────────────────────────────────────────────
exports.onboardingSchema = zod_1.z.object({
  username: exports.usernameSchema,
  displayName: zod_1.z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(64, "Display name must be at most 64 characters"),
  // Avatar upload is handled separately via Supabase Storage (Phase 2+)
});
// ─── Profile update ────────────────────────────────────────────────────────
exports.updateProfileSchema = zod_1.z.object({
  displayName: zod_1.z.string().trim().min(1).max(64).optional(),
  bio: zod_1.z.string().trim().max(280, "Bio must be at most 280 characters").optional(),
  avatarUrl: zod_1.z.string().url().optional().nullable(),
});
// ─── User preferences update ───────────────────────────────────────────────
exports.updatePreferencesSchema = zod_1.z.object({
  theme: zod_1.z.enum(["dark", "light", "system"]).optional(),
  locale: zod_1.z.enum(["fr", "en"]).optional(),
  emailNotifications: zod_1.z.boolean().optional(),
  reviewReminders: zod_1.z.boolean().optional(),
  weeklyDigest: zod_1.z.boolean().optional(),
  publicProfile: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=user.schema.js.map
