import type { User } from "@supabase/supabase-js";
import { userRepository, type UserRole } from "@cyberlearn/db";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function metadataString(metadata: unknown, keys: readonly string[]): string | undefined {
  if (!isRecord(metadata)) return undefined;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

// The role comes straight out of the users table, so it is typed from the
// schema rather than spelled out again here. A hand-written union is a second
// copy of the enum that nothing keeps in step: TEACHER had to be added to it by
// hand, and the next role would have to be too - silently, because a value the
// database can return and this type cannot name is a type error at the call
// site, not here.
async function syncAuthenticatedUser(user: User): Promise<{
  username: string | null;
  role: UserRole;
}> {
  const email = user.email ?? "";
  const [rawEmailPrefix] = email.split("@");
  const emailPrefix = rawEmailPrefix?.trim() ? rawEmailPrefix : "Apprenti";
  const displayName =
    metadataString(user.user_metadata, ["full_name", "name", "user_name"]) ?? emailPrefix;
  const avatarUrl = metadataString(user.user_metadata, ["avatar_url", "picture"]) ?? null;

  return userRepository.upsertFromAuth({
    id: user.id,
    email,
    displayName,
    avatarUrl,
  });
}

/** What `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` answers. */
export interface AssuranceCheck {
  // Strings, not "aal1" | "aal2": supabase-js now types the levels open-ended
  // (`'aal1' | 'aal2' | (string & {})`), ready for levels to come.
  data: { currentLevel: string | null; nextLevel: string | null } | null;
  error: unknown;
}

/**
 * Whether the session must go through the MFA challenge first. It must when
 * the level it can reach is not the one it holds, whatever that level is
 * called: the check used to name "aal2", so a higher level added later would
 * have been let through without a challenge. An error, or no answer, is a
 * challenge too.
 */
export function needsMfaStep(assurance: AssuranceCheck): boolean {
  if (assurance.error || !assurance.data) return true;
  const { currentLevel, nextLevel } = assurance.data;
  return nextLevel !== null && nextLevel !== currentLevel;
}

export async function resolveUserPostSignInRoute(
  assurance: AssuranceCheck,
  user: User,
  requestedRoute: string,
): Promise<string> {
  if (needsMfaStep(assurance)) {
    return `/mfa?next=${encodeURIComponent(requestedRoute)}`;
  }

  const profile = await syncAuthenticatedUser(user);
  if (requestedRoute === "/reset-password") return requestedRoute;
  if (!profile.username) return "/onboarding";
  if (user.app_metadata.onboarding_complete !== true) return "/onboarding/avatar";
  return requestedRoute;
}
