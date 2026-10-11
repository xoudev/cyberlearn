"use server";

import * as Sentry from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
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
import { RECOVERY_GRANT_COOKIE } from "@/lib/auth/recovery-grant";
import { verifyCurrentPassword } from "@/lib/auth/verify-password";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "./auth-action-state";

const SIGN_UP_ERROR_MESSAGES: Record<SignUpFailure, string> = {
  email_rate_limit:
    "Le service d’e-mail est temporairement saturé. Réessaie dans quelques minutes.",
  invalid_email: "Cette adresse e-mail ne peut pas être utilisée.",
  unknown: "Impossible de créer le compte pour le moment. Réessaie dans quelques minutes.",
};

async function isRateLimited(): Promise<boolean> {
  const headerStore = await headers();
  return !(await checkAuthRateLimit({ headers: headerStore }));
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
    };
  }
  if (await isRateLimited()) {
    return {
      status: "error",
      message: "Trop de tentatives. Réessaie dans 15 minutes.",
      redirectTo: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
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
        email: parsed.data.email,
      };
    }
    return {
      status: "error",
      message: "Adresse e-mail ou mot de passe incorrect.",
      redirectTo: null,
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
    };
  }
  if (await isRateLimited()) {
    return {
      status: "error",
      message: "Trop de tentatives. Réessaie dans 15 minutes.",
      redirectTo: null,
    };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
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
        email: parsed.data.email,
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
    };
  } catch (signUpError) {
    Sentry.captureException(signUpError, { tags: { area: "auth.sign-up" } });
  }

  return {
    status: "error",
    message: SIGN_UP_ERROR_MESSAGES.unknown,
    redirectTo: null,
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
  if (await isRateLimited()) {
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
  if (await isRateLimited()) {
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
  const hasRecoveryGrant = cookieStore.get(RECOVERY_GRANT_COOKIE)?.value === "1";

  if (!hasRecoveryGrant) {
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
  if (hasRecoveryGrant) cookieStore.delete(RECOVERY_GRANT_COOKIE);

  return {
    status: "success",
    message: "Mot de passe mis à jour.",
    redirectTo: "/dashboard",
  };
}
