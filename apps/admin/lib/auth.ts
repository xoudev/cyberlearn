import { cache } from "react";
import { redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { ACCESS_DENIED_PATH } from "@/lib/auth-redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Requires an ADMIN session that has completed the mandatory TOTP challenge. */
export async function requireAdminAction(): Promise<{
  id: string;
  email: string | undefined;
  role: "ADMIN";
}> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [dbUser, assurance] = await Promise.all([
    userRepository.findRoleById(user.id),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  // The role before the second factor: an account that is not ADMIN has no
  // factor to set up here, and is told so instead of being sent to enrol one.
  // It used to get a 404, from every page and every action, with no way to
  // sign out - an administrator demoted while signed in stayed stuck there.
  if (dbUser?.role !== "ADMIN") redirect(ACCESS_DENIED_PATH);

  // The verified TOTP factors ride on the user object already fetched above -
  // calling mfa.listFactors() would trigger a second network roundtrip.
  const hasVerifiedTotp =
    user.factors?.some((factor) => factor.factor_type === "totp" && factor.status === "verified") ??
    false;
  if (!hasVerifiedTotp) redirect("/mfa/setup");
  if (assurance.error || assurance.data.currentLevel !== "aal2") redirect("/mfa");

  return { id: user.id, email: user.email, role: "ADMIN" };
}

/**
 * The same check for a page, once per request: the layout and the page both
 * call it, and React's cache() makes the second call free.
 *
 * Every page calls it, not only the layout. A client navigation renders just
 * the segments that change, and the router state that says which ones are
 * already on screen comes from the request - so a crafted request could have
 * a page rendered without its layout, and its layout's check, ever running.
 * That was verified against a build: an anonymous request got /users to run
 * its user query. src/__tests__ holds a test that fails for a page without it.
 */
export const requireAdminPage = cache(requireAdminAction);
