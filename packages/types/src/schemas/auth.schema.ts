import { z } from "zod";

export const authEmailSchema = z
  .string()
  .trim()
  .email("A valid email address is required")
  .max(254, "Email address is too long")
  .transform((email) => email.toLowerCase());

export const newPasswordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters")
  .max(128, "Password must contain at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const authRedirectSchema = z
  .string()
  .max(500)
  .refine(
    (value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"),
    "Redirect must be a local path",
  )
  .default("/dashboard");

export const passwordSignInSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Password is required").max(128),
  redirectTo: authRedirectSchema,
});

export const passwordSignUpSchema = z
  .object({
    email: authEmailSchema,
    password: newPasswordSchema,
    passwordConfirmation: z.string(),
  })
  .superRefine(({ password, passwordConfirmation }, context) => {
    if (password !== passwordConfirmation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordConfirmation"],
        message: "Passwords do not match",
      });
    }
  });

export const passwordResetRequestSchema = z.object({
  email: authEmailSchema,
});

export const passwordUpdateSchema = z
  .object({
    password: newPasswordSchema,
    passwordConfirmation: z.string(),
  })
  .superRefine(({ password, passwordConfirmation }, context) => {
    if (password !== passwordConfirmation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordConfirmation"],
        message: "Passwords do not match",
      });
    }
  });

export const mfaCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Authenticator code must contain exactly 6 digits");

export type PasswordSignInInput = z.infer<typeof passwordSignInSchema>;
export type PasswordSignUpInput = z.infer<typeof passwordSignUpSchema>;
export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;
