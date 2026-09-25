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
