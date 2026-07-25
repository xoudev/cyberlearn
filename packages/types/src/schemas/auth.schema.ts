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

/** C0 controls and DEL: the URL parser strips some of them, so none are allowed. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Post-authentication redirect target. Must stay inside the site.
 *
 * The "starts with a single slash" test is not enough on its own: the URL
 * parser strips leading tab, CR and LF from a path before resolving it, so
 * `/\t/evil.com` passes the check and then resolves to `https://evil.com/`.
 * Percent-encoded (%09, %0A, %0D) they survive `searchParams.get()` decoding
 * and land in the value verbatim. Rejecting every C0 control character - and
 * the backslash, which Windows-style parsers treat as a separator - closes it.
 */
export const authRedirectSchema = z
  .string()
  .max(500)
  .refine(
    (value) =>
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\") &&
      !hasControlCharacter(value),
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
