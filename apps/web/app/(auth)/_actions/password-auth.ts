"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import {
  passwordResetRequestSchema,
  passwordSignInSchema,
  passwordSignUpSchema,
  passwordUpdateSchema,
} from "@cyberlearn/types";
import { env } from "@/lib/env";
import { resolveUserPostSignInRoute } from "@/lib/auth/password-flow";
import { classifySignUpError, type SignUpFailure } from "@/lib/auth/sign-up-error";
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
    return {
      status: "error",
      message: "Identifiants incorrects ou adresse e-mail non vérifiée.",
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

  const supabase = await getSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  return {
    status: "check_email",
    message: "Si ce compte existe, un lien sécurisé a été envoyé à cette adresse.",
    redirectTo: null,
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

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message: "Le mot de passe n’a pas pu être mis à jour.",
      redirectTo: null,
    };
  }

  return {
    status: "success",
    message: "Mot de passe mis à jour.",
    redirectTo: "/dashboard",
  };
}
