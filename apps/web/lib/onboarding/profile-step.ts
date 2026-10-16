/**
 * What step 1 of the onboarding shows: the form, filled with what the account
 * already holds, or "done" when the step is behind the reader and the page
 * should move on to the avatar.
 *
 * The step is behind them once they have a handle. "← Retour" on the avatar
 * step comes back with `?edit=1`, and the form shows again then: without it,
 * the page bounced straight back to the avatar, and the handle, the name and
 * the bio could not be corrected before the end of the sign-up. The app goes
 * back the same way (apps/mobile/app/onboarding.tsx).
 */

export interface ProfileStepAccount {
  username: string | null;
  displayName: string | null;
  bio: string | null;
}

export interface ProfileStepForm {
  username: string;
  displayName: string;
  bio: string;
}

/** The name a new account is given before it chooses one: not worth showing back. */
const PLACEHOLDER_DISPLAY_NAME = "Utilisateur";

/** The query that asks for step 1 again. */
export const EDIT_PROFILE_QUERY = "edit=1";

export function profileStepView(
  account: ProfileStepAccount | null,
  params: Record<string, string | string[] | undefined>,
): ProfileStepForm | "done" {
  const editing = params.edit === "1";
  if (account?.username && !editing) return "done";

  const displayName = account?.displayName ?? "";
  return {
    username: account?.username ?? "",
    displayName: displayName === PLACEHOLDER_DISPLAY_NAME ? "" : displayName,
    bio: account?.bio ?? "",
  };
}
