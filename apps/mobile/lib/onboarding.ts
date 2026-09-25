/**
 * Signing up in the app: the site's three steps (identity, avatar, goal) and
 * which one an account is at. The rules on what is accepted are the server's
 * (apps/web/lib/onboarding/steps.ts); this module only decides where to start
 * and words the form.
 */

export {
  DEFAULT_ONBOARDING_AVATAR,
  ONBOARDING_AVATAR_CHOICES,
  isOnboardingAvatar,
} from "@cyberlearn/lib/onboarding/avatars";

export type OnboardingStep = "profile" | "avatar" | "goals";

/** The steps, in order, with the site's names for them. */
export const ONBOARDING_STEPS: { step: OnboardingStep; label: string }[] = [
  { step: "profile", label: "Identité" },
  { step: "avatar", label: "Avatar" },
  { step: "goals", label: "Objectif" },
];

/**
 * Where an account starts, as the site decides it: no handle yet means the
 * first step; a handle without the completion flag means the avatar step, as
 * the site's sign-in sends such an account to /onboarding/avatar. Null once
 * signing up is done.
 */
export function onboardingStepFor(account: {
  username: string | null;
  onboardingComplete: boolean;
}): OnboardingStep | null {
  if (!account.username) return "profile";
  if (!account.onboardingComplete) return "avatar";
  return null;
}

/** Whether the token says signing up is complete (app_metadata.onboarding_complete). */
export function onboardingCompleteIn(appMetadata: unknown): boolean {
  return (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    "onboarding_complete" in appMetadata &&
    appMetadata.onboarding_complete === true
  );
}

/** A handle as it is typed: no spaces, lower case, which is all the site accepts. */
export function handleInput(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

export const BIO_MAX = 280;
export const DISPLAY_NAME_MAX = 64;
export const USERNAME_MAX = 32;
