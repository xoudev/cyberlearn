import { z } from "zod";
export declare const usernameSchema: z.ZodString;
export declare const onboardingSchema: z.ZodObject<
  {
    username: z.ZodString;
    displayName: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    username: string;
    displayName: string;
  },
  {
    username: string;
    displayName: string;
  }
>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export declare const updateProfileSchema: z.ZodObject<
  {
    displayName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
  },
  "strip",
  z.ZodTypeAny,
  {
    displayName?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | null | undefined;
  },
  {
    displayName?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | null | undefined;
  }
>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export declare const updatePreferencesSchema: z.ZodObject<
  {
    theme: z.ZodOptional<z.ZodEnum<["dark", "light", "system"]>>;
    locale: z.ZodOptional<z.ZodEnum<["fr", "en"]>>;
    emailNotifications: z.ZodOptional<z.ZodBoolean>;
    reviewReminders: z.ZodOptional<z.ZodBoolean>;
    weeklyDigest: z.ZodOptional<z.ZodBoolean>;
    publicProfile: z.ZodOptional<z.ZodBoolean>;
  },
  "strip",
  z.ZodTypeAny,
  {
    theme?: "dark" | "light" | "system" | undefined;
    locale?: "fr" | "en" | undefined;
    emailNotifications?: boolean | undefined;
    reviewReminders?: boolean | undefined;
    weeklyDigest?: boolean | undefined;
    publicProfile?: boolean | undefined;
  },
  {
    theme?: "dark" | "light" | "system" | undefined;
    locale?: "fr" | "en" | undefined;
    emailNotifications?: boolean | undefined;
    reviewReminders?: boolean | undefined;
    weeklyDigest?: boolean | undefined;
    publicProfile?: boolean | undefined;
  }
>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
//# sourceMappingURL=user.schema.d.ts.map
