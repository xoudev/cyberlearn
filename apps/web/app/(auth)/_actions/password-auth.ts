"use server";

import * as Sentry from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  confirmationResendSchema,
  passwordResetRequestSchema,
  passwordSignInSchema,
  passwordSignUpSchema,
  passwordUpdateSchema,
} from "@cyberlearn/types";
import {
  CONFIRMATION_RESENT_MESSAGE,
  EMAIL_NOT_CONFIRMED_MESSAGE,
  isEmailNotConfirmedError,
} from "@cyberlearn/lib/auth/email-confirmation";
import { env } from "@/lib/env";
import { resolveUserPostSignInRoute } from "@/lib/auth/password-flow";
import { classifySignUpError, type SignUpFailure } from "@/lib/auth/sign-up-error";
import {
  RECOVERY_EXPIRED_MESSAGE,
  RECOVERY_GRANT_COOKIE,
  hasRecoveryGrant,
} from "@/lib/auth/recovery-grant";
import { verifyCurrentPassword } from "@/lib/auth/verify-password";
import { allowAuthAttempt, recordSignInFailure, type AuthAction } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "./auth-action-state";

const SIGN_UP_ERROR_MESSAGES: Record<SignUpFailure, string> = {
  email_rate_limit:
    "Le service d’e-mail est temporairement saturé. Réessaie dans quelques minutes.",
  invalid_email: "Cette adresse e-mail ne peut pas être utilisée.",
  unknown: "Impossible de créer le compte pour le moment. Réessaie dans quelques minutes.",
};

/** What the reset form sends, telling it apart from the settings' password form. */
const recoveryIntentSchema = z.literal("recovery");

async function isRateLimited(action: AuthAction, email: string): Promise<boolean> {
  return !(await allowAuthAttempt(action, { headers: await headers() }, email));
}

/**
 * Whether Supabase refused the credentials themselves, which is all the
 * network's sign-in budget counts. An outage (a 5xx, a network failure) or
 * Supabase's own rate limit says nothing about the password, and must not
 * lock anybody out on top of it.
 */
function isCredentialRefusal(error: { status?: number | undefined }): boolean {
  const { status } = error;
  return status !== undefined && status >= 400 && status < 500 && status !== 429;
}

/**
 * The address as it was typed, to put back in a form React has reset. Only
 * when it is a string, and never longer than an address can be.
 */
function typedEmail(formData: FormData): { email?: string } {
  const value = formData.get("email");
  return typeof value === "string" && value.length > 0 ? { email: value.slice(0, 254) } : {};
}

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? "/dashboard",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie ton e-mail et ton mot de passe.",
      redirectTo: null,
      ...typedEmail(formData),
    };
  }
  const { email } = parsed.data;
  if (await isRateLimited("sign-in", email)) {
    return {
      status: "error",
      message: "Trop de tentatives. Réessaie dans 15 minutes.",
      redirectTo: null,
      email,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase says "not confirmed" only once the password has matched, so
    // this tells nothing to somebody who does not hold it.
    if (isEmailNotConfirmedError(error)) {
      return {
        status: "unconfirmed",
        message: EMAIL_NOT_CONFIRMED_MESSAGE,
        redirectTo: null,
        email,
      };
    }
    if (isCredentialRefusal(error)) {
      await recordSignInFailure({ headers: await headers() }, email);
    }
    return {
      status: "error",
      message: "Adresse e-mail ou mot de passe incorrect.",
      redirectTo: null,
      email,
    };
  }

  try {
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const redirectTo = await resolveUserPostSignInRoute(
      assurance,
      data.user,
      parsed.data.redirectTo,
    );
    return { status: "success", message: null, redirectTo };
  } catch (profileError) {
    Sentry.captureException(profileError, { tags: { area: "auth.profile-sync" } });
    await supabase.auth.signOut({ scope: "local" });
    return {
      status: "error",
      message: "La session n’a pas pu être initialisée. Réessaie dans un instant.",
      redirectTo: null,
      email,
    };
  }
}

export async function signUpWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordSignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        "Utilise au moins 12 caractères avec une lettre et un chiffre, puis confirme le mot de passe.",
      redirectTo: null,
      ...typedEmail(formData),
    };
  }
  const { email } = parsed.data;
  if (await isRateLimited("sign-up", email)) {
    return {
      status: "error",
      message: "Trop de tentatives. Réessaie dans 15 minutes.",
      redirectTo: null,
      email,
    };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`,
      },
    });

    if (!error) {
      return {
        status: "check_email",
        message: "Un e-mail de vérification vient de partir. Ouvre-le pour activer ton compte.",
        redirectTo: null,
        email,
      };
    }

    const failure = classifySignUpError(error);
    Sentry.captureException(error, {
      tags: {
        area: "auth.sign-up",
        auth_code: error.code ?? "unknown",
        failure,
      },
      extra: { status: error.status },
    });
    return {
      status: "error",
      message: SIGN_UP_ERROR_MESSAGES[failure],
      redirectTo: null,
      email,
    };
  } catch (signUpError) {
    Sentry.captureException(signUpError, { tags: { area: "auth.sign-up" } });
  }

  return {
    status: "error",
    message: SIGN_UP_ERROR_MESSAGES.unknown,
    redirectTo: null,
    email,
  };
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Adresse e-mail invalide.", redirectTo: null };
  }
  if (await isRateLimited("password-reset", parsed.data.email)) {
    return {
      status: "error",
      message: "Trop de demandes. Réessaie dans 15 minutes.",
      redirectTo: null,
    };
  }

  // A refusal Supabase returns (no such account, an address it will not mail)
  // keeps the neutral answer below, so the form does not say which addresses
  // exist. A throw is the service itself being unreachable, which says nothing
  // about the address, and used to replace the page with the error screen.
  try {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
    });
  } catch (resetError) {
    Sentry.captureException(resetError, { tags: { area: "auth.password-reset" } });
    return {
      status: "error",
      message: "Le service d’e-mail est indisponible. Réessaie dans quelques minutes.",
      redirectTo: null,
    };
  }

  return {
    status: "check_email",
    message: "Si ce compte existe, un lien sécurisé a été envoyé à cette adresse.",
    redirectTo: null,
  };
}

/**
 * Sends the sign-up confirmation mail again.
 *
 * Offered where an unconfirmed address shows up: the sign-in of an account
 * that never opened its first mail, and the "check your inbox" step of the
 * sign-up. Rate-limited like the other auth actions, since each call sends a
 * mail to an address the caller typed.
 */
export async function resendConfirmationEmail(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = confirmationResendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Adresse e-mail invalide.", redirectTo: null };
  }
  if (await isRateLimited("resend-confirmation", parsed.data.email)) {
    return {
      status: "error",
      message: "Trop de demandes. Réessaie dans 15 minutes.",
      redirectTo: null,
      email: parsed.data.email,
    };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`,
      },
    });
    if (error && classifySignUpError(error) === "email_rate_limit") {
      return {
        status: "error",
        message: SIGN_UP_ERROR_MESSAGES.email_rate_limit,
        redirectTo: null,
        email: parsed.data.email,
      };
    }
    // Any other refusal (an address already confirmed, or unknown) gets the
    // neutral answer below: which addresses wait for a confirmation is not
    // something to tell whoever asks.
  } catch (resendError) {
    Sentry.captureException(resendError, { tags: { area: "auth.resend-confirmation" } });
    return {
      status: "error",
      message: "Le service d’e-mail est indisponible. Réessaie dans quelques minutes.",
      redirectTo: null,
      email: parsed.data.email,
    };
  }

  return {
    status: "check_email",
    message: CONFIRMATION_RESENT_MESSAGE,
    redirectTo: null,
    email: parsed.data.email,
  };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        "Utilise au moins 12 caractères avec une lettre et un chiffre, puis confirme le mot de passe.",
      redirectTo: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "La session a expiré. Recommence la procédure.",
      redirectTo: null,
    };
  }

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    assurance.error ||
    (assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2")
  ) {
    return {
      status: "error",
      message: "Valide d’abord ton code de double authentification.",
      redirectTo: null,
    };
  }

  // Re-authentication. Skipping the current password is legitimate only right
  // after an emailed recovery link (marked by /auth/confirm); otherwise a
  // stolen session would be enough to lock the owner out for good.
  const cookieStore = await cookies();
  const granted = hasRecoveryGrant(cookieStore);

  if (!granted) {
    // The reset form has no field for the current password - it is the one
    // that was forgotten. Past the window, what it needs is a new link.
    if (recoveryIntentSchema.safeParse(formData.get("intent")).success) {
      return { status: "recovery_expired", message: RECOVERY_EXPIRED_MESSAGE, redirectTo: null };
    }
    const currentPassword = formData.get("currentPassword");
    if (typeof currentPassword !== "string" || currentPassword.length === 0) {
      return {
        status: "error",
        message: "Saisis ton mot de passe actuel pour confirmer le changement.",
        redirectTo: null,
      };
    }
    if (!user.email || !(await verifyCurrentPassword(user.email, currentPassword))) {
      return {
        status: "error",
        message: "Le mot de passe actuel est incorrect.",
        redirectTo: null,
      };
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message: "Le mot de passe n’a pas pu être mis à jour.",
      redirectTo: null,
    };
  }

  // The grant unlocks a single password update.
  if (granted) cookieStore.delete(RECOVERY_GRANT_COOKIE);

  return {
    status: "success",
    message: "Mot de passe mis à jour.",
    redirectTo: "/dashboard",
  };
}

/**
 * Ends the session a recovery link opened and goes back to "Mot de passe
 * oublié", for a recovery window that closed before the new password was set.
 *
 * The middleware sends a signed-in account away from /forgot-password, so
 * without signing out first there was no way to ask for a new link: the reset
 * form asked for the current password, which it has no field for.
 */
export async function restartPasswordRecovery(): Promise<never> {
  try {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (signOutError) {
    Sentry.captureException(signOutError, { tags: { area: "auth.password-reset" } });
  }
  (await cookies()).delete(RECOVERY_GRANT_COOKIE);
  redirect("/forgot-password");
}
