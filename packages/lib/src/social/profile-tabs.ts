/**
 * The tabs of the site's profile, as its address names them: `/profile?tab=badges`.
 *
 * The badges and the certificates had pages of their own (/badges,
 * /certificates). They are tabs of the profile now, and a link to one of them
 * (a notice in the bell, the button after an exam) names its tab. The app
 * reads the same values to open the matching sub-tab of its Profile screen
 * (apps/mobile/lib/notification-links.ts), so they are written once, here.
 */

export const PROFILE_TABS = ["activite", "badges", "certificats"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

/** The tab a bare /profile opens on. */
export const DEFAULT_PROFILE_TAB: ProfileTab = "badges";

/** The address of one of the profile's tabs. */
export function profileTabHref(tab: ProfileTab): string {
  return `/profile?tab=${tab}`;
}
