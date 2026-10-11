/**
 * The profile tab's sub-tabs, and the one a link can ask for.
 *
 * A notice about a certificate or a badge opens the profile tab, where both
 * live; without saying which sub-tab, it opened on whatever was showing last
 * (Badges at first), and the reader had to find the certificates themselves.
 * The link carries `?tab=certificats`, and the screen opens on it.
 */

export const PROFILE_SUB_TABS = ["Badges", "Certificats", "Stats", "Collection"] as const;

export type ProfileSub = (typeof PROFILE_SUB_TABS)[number];

/** What a link puts in `?tab=`: the sub-tab's label, in lower case. */
export type ProfileSubParam = Lowercase<ProfileSub>;

/** The param for a sub-tab, for a route to put in its `params`. */
export function profileSubParam(sub: ProfileSub): ProfileSubParam {
  // SAFETY: toLowerCase of a member of the union is the matching Lowercase<> member.
  return sub.toLowerCase() as ProfileSubParam;
}

/**
 * The sub-tab a `?tab=` value asks for, or null for none or one that does not
 * exist. Expo hands a repeated param over as an array; the first one counts.
 */
export function profileSubFrom(value: string | string[] | undefined): ProfileSub | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return null;
  const wanted = raw.toLowerCase();
  return PROFILE_SUB_TABS.find((sub) => sub.toLowerCase() === wanted) ?? null;
}
