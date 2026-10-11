"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { passwordSignInSchema } from "@cyberlearn/types";
import { userRepository } from "@cyberlearn/db";
import { safeAdminRedirect, withReturnPath } from "@/lib/auth-redirect";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminAuthState } from "./auth-state";

export async function signInAdminWithPassword(
  _previousState: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const parsed = passwordSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    // Checked on its own first: a destination the console refuses becomes the
    // dashboard, rather than failing a sign-in whose credentials are right.
    redirectTo: safeAdminRedirect(formData.get("redirectTo")),
  });
  if (!parsed.success) {
    return { status: "error", message: "Identifiants invalides.", redirectTo: null };
  }

  // Infra failures (database unreachable, auth service down, missing runtime
  // config) must surface as a friendly retry message - an unhandled throw here
  // replaces the login page with the fatal error screen and locks admins out.
  try {
    const headerStore = await headers();
    if (!(await checkAuthRateLimit({ headers: headerStore }))) {
      return {
        status: "error",
        message: "Trop de tentatives. Réessaie dans 15 minutes.",
        redirectTo: null,
      };
    }

    const expectedRole = await userRepository.findRoleByEmail(parsed.data.email);
    if (expectedRole?.role !== "ADMIN") {
      return { status: "error", message: "Identifiants invalides.", redirectTo: null };
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      return { status: "error", message: "Identifiants invalides.", redirectTo: null };
    }

    const actualRole = await userRepository.findRoleById(data.user.id);
    if (actualRole?.role !== "ADMIN") {
      await supabase.auth.signOut();
      return { status: "error", message: "Identifiants invalides.", redirectTo: null };
    }

    // The page the admin was going to. It rides along to the TOTP screen as
    // `next`, which hands it on once the code is accepted.
    const destination = parsed.data.redirectTo;

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error || factors.data.totp.length === 0) {
      return {
        status: "success",
        message: null,
        redirectTo: withReturnPath("/mfa/setup", "next", destination),
      };
    }

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const redirectTo =
      !assurance.error && assurance.data.currentLevel === "aal2"
        ? destination
        : withReturnPath("/mfa", "next", destination);
    return { status: "success", message: null, redirectTo };
  } catch (signInError) {
    Sentry.captureException(signInError, { tags: { area: "admin.auth.sign-in" } });
    return {
      status: "error",
      message: "Le service d'authentification est indisponible. Réessaie dans un instant.",
      redirectTo: null,
    };
  }
}
