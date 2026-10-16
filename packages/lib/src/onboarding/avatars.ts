/**
 * The avatars a new account picks from while signing up: the same eight, with
 * the same names, on the site and in the app. The server accepts nothing else
 * at this step; a photo goes through the upload service
 * (apps/web/lib/avatar/upload.ts), from the site or the app.
 */
export const ONBOARDING_AVATAR_CHOICES = [
  { path: "/avatars/av-1.svg", label: "CYBER" },
  { path: "/avatars/av-2.svg", label: "CIRCUIT" },
  { path: "/avatars/av-3.svg", label: "ALERT" },
  { path: "/avatars/av-4.svg", label: "ORBIT" },
  { path: "/avatars/av-5.svg", label: "SIGNAL" },
  { path: "/avatars/av-6.svg", label: "SHIELD" },
  { path: "/avatars/av-7.svg", label: "NODE" },
  { path: "/avatars/av-8.svg", label: "CL" },
] as const;

export type OnboardingAvatar = (typeof ONBOARDING_AVATAR_CHOICES)[number]["path"];

export const ONBOARDING_AVATARS: readonly [OnboardingAvatar, ...OnboardingAvatar[]] = [
  "/avatars/av-1.svg",
  ...ONBOARDING_AVATAR_CHOICES.slice(1).map((c) => c.path),
];

/** What the site's form sends when nothing was picked. */
export const DEFAULT_ONBOARDING_AVATAR: OnboardingAvatar = "/avatars/av-8.svg";

/** Whether a stored avatar is one of the eight, to preselect it. */
export function isOnboardingAvatar(value: string | null): value is OnboardingAvatar {
  return ONBOARDING_AVATARS.some((path) => path === value);
}

/**
 * What the avatar step sends to keep the avatar the profile already has
 * (see `avatarToKeep`) rather than pick one of the eight. The server writes
 * nothing for it.
 */
export const KEEP_CURRENT_AVATAR = "current";

/**
 * The avatar the step offers first, and preselects: whatever the profile
 * holds that is not one of the eight - the picture of the identity the
 * account signed up with (GitHub's), a photo uploaded at this very step
 * (`__upload:<key>`, a marker each app resolves to draw it), or a glyph.
 *
 * The step used to preselect "CL" whenever the avatar was not one of the
 * eight, so continuing without a second look replaced it: the GitHub photo
 * at the first visit, an uploaded one when the learner came back from the
 * goals step.
 *
 * Null for one of the eight or nothing.
 */
export function avatarToKeep(stored: string | null): string | null {
  if (stored === null || stored === "" || isOnboardingAvatar(stored)) return null;
  return stored;
}

/**
 * What the avatar step starts on, on the site and in the app: the one of the
 * eight in use, else the avatar to keep, else "CL".
 */
export function initialOnboardingChoice(stored: string | null): string {
  if (isOnboardingAvatar(stored)) return stored;
  return avatarToKeep(stored) !== null ? KEEP_CURRENT_AVATAR : DEFAULT_ONBOARDING_AVATAR;
}
