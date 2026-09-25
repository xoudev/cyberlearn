import { AVATAR_PATHS } from "@cyberlearn/types";

/**
 * Editing one's own profile in the app: the site's /settings/profile. The
 * rules are the server's (apps/web/lib/profile/update-profile.ts); this module
 * only decides what the form starts from and what it sends.
 */

export const PROFILE_AVATARS: readonly string[] = AVATAR_PATHS;
export const PROFILE_BIO_MAX = 280;
export const PROFILE_NAME_MAX = 64;

/**
 * What the avatar picker starts on: the built-in avatar in use, or "current"
 * when the account shows something the picker does not offer (an uploaded
 * photo, a glyph) and which saving must leave alone.
 */
export function initialAvatarChoice(stored: string | null): string {
  return stored !== null && PROFILE_AVATARS.includes(stored) ? stored : "current";
}

/** The body to send: the avatar only when a built-in one was picked. */
export function profileEditBody(form: {
  displayName: string;
  bio: string;
  avatar: string;
}): { displayName: string; bio: string; avatarUrl?: string } {
  const body = { displayName: form.displayName.trim(), bio: form.bio.trim() };
  return PROFILE_AVATARS.includes(form.avatar) ? { ...body, avatarUrl: form.avatar } : body;
}
