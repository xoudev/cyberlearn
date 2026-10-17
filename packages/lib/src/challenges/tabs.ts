/**
 * The tabs of the site's challenges section, as its address names them:
 * `/challenges` for the catalogue, `/challenges?tab=tournois` for the
 * tournaments.
 *
 * The tournaments had a page of their own (/tournaments), listed only for
 * somebody in a class. They are a tab of the challenges now, open to everyone.
 * The app keeps its Tournaments screen and reads these values to find it from
 * a link (apps/mobile/lib/notification-links.ts).
 */

export const CHALLENGES_TABS = ["defis", "tournois"] as const;

export type ChallengesTab = (typeof CHALLENGES_TABS)[number];

/** The tab a bare /challenges opens on. */
export const DEFAULT_CHALLENGES_TAB: ChallengesTab = "defis";

/** The address of one of the tabs; the default one is the bare section. */
export function challengesTabHref(tab: ChallengesTab): string {
  return tab === DEFAULT_CHALLENGES_TAB ? "/challenges" : `/challenges?tab=${tab}`;
}
