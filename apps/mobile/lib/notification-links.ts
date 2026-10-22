import type { ChallengesTab } from "@cyberlearn/lib/challenges/tabs";
import { threadFromHref } from "./forum";
import { profileSubFrom, profileSubParam, type ProfileSubParam } from "./profile-tabs";

/**
 * Where a notification leads, in the app. The site stores a link to one of its
 * own pages on each notification (`actionUrl`); this finds the screen of the
 * app that shows the same thing, or null when there is none and the
 * notification only needs reading.
 */

export type InAppRoute =
  | { pathname: "/moderation" }
  | { pathname: "/forum/[category]/[topic]"; params: { category: string; topic: string } }
  | { pathname: "/forum/[category]"; params: { category: string } }
  | { pathname: "/challenges/[slug]"; params: { slug: string } }
  | { pathname: "/support/[id]"; params: { id: string } }
  | { pathname: "/lessons/[slug]"; params: { slug: string } }
  | { pathname: "/paths/[slug]"; params: { slug: string } }
  | { pathname: "/u/[username]"; params: { username: string } }
  | { pathname: "/duels/[id]"; params: { id: string } }
  | { pathname: "/tournaments/[id]"; params: { id: string } }
  // A sub-tab of the profile: the certificates and the badges both live there.
  | { pathname: "/profile"; params: { tab: ProfileSubParam } }
  | {
      pathname:
        | "/lessons"
        | "/notes"
        | "/my-class"
        | "/profile"
        | "/revisions"
        | "/friends"
        | "/duels"
        | "/tournaments"
        | "/challenges"
        | "/placement"
        // The tabs the site's pages of the same name are, and the screens an
        // announcement of the console can point at.
        | "/home"
        | "/paths"
        | "/leaderboard"
        | "/forum"
        | "/support"
        | "/glossary"
        | "/locker"
        | "/changelog";
    };

const SLUG = "([a-z0-9-]+)";

function certificates(): InAppRoute {
  return { pathname: "/profile", params: { tab: profileSubParam("Certificats") } };
}

/**
 * The `tab` a link's query names, or null. Read by hand rather than through
 * URLSearchParams: the values are plain words, and React Native's own
 * URLSearchParams has not always implemented `get`.
 */
function tabParam(query: string): string | null {
  const match = /(?:^|&)tab=([^&]*)/u.exec(query);
  return match?.[1] ?? null;
}

/**
 * The profile, on the sub-tab a link names. The site's tabs are
 * `/profile?tab=activite|badges|certificats` (@cyberlearn/lib/social/profile-tabs):
 * the badges and the certificates have a sub-tab here of the same name, the
 * activity has none and opens the profile as it is.
 */
function profileOn(tab: string | null): InAppRoute {
  const sub = profileSubFrom(tab ?? undefined);
  return sub === null
    ? { pathname: "/profile" }
    : { pathname: "/profile", params: { tab: profileSubParam(sub) } };
}

export function inAppRouteFor(actionUrl: string | null): InAppRoute | null {
  if (actionUrl === null) return null;
  const [beforeHash = ""] = actionUrl.split("#");
  const [rawPath = "", query = ""] = beforeHash.split("?");
  const path = rawPath.replace(/\/$/u, "");
  const tab = tabParam(query);

  const thread = threadFromHref(path);
  if (thread) {
    return {
      pathname: "/forum/[category]/[topic]",
      params: { category: thread.category, topic: thread.slug },
    };
  }
  // A section of the forum: /forum/<section>, one segment under /forum. The
  // thread above has two.
  const section = new RegExp(`^/forum/${SLUG}$`, "u").exec(path)?.[1];
  if (section) return { pathname: "/forum/[category]", params: { category: section } };
  const challenge = new RegExp(`^/challenges/${SLUG}$`, "u").exec(path)?.[1];
  if (challenge) return { pathname: "/challenges/[slug]", params: { slug: challenge } };
  // A request of the support page: its id is a UUID.
  const ticket = /^\/support\/([0-9a-f-]{36})$/u.exec(path)?.[1];
  if (ticket) return { pathname: "/support/[id]", params: { id: ticket } };
  const lesson = new RegExp(`^/lessons/${SLUG}$`, "u").exec(path)?.[1];
  if (lesson) return { pathname: "/lessons/[slug]", params: { slug: lesson } };
  const pathSlug = new RegExp(`^/paths/${SLUG}$`, "u").exec(path)?.[1];
  if (pathSlug) return { pathname: "/paths/[slug]", params: { slug: pathSlug } };
  // A friend request or an acceptance points at the other person's profile.
  const username = new RegExp(`^/u/${SLUG}$`, "u").exec(path)?.[1];
  if (username) return { pathname: "/u/[username]", params: { username } };

  // A duel's invitation, acceptance or result opens the duel.
  const duel = /^\/duels\/([0-9a-f-]{36})$/u.exec(path)?.[1];
  if (duel) return { pathname: "/duels/[id]", params: { id: duel } };
  // A tournament announced to the reader's class opens the tournament.
  const tournament = /^\/tournaments\/([0-9a-f-]{36})$/u.exec(path)?.[1];
  if (tournament) return { pathname: "/tournaments/[id]", params: { id: tournament } };
  // Older certificate notices pointed at the site's PDF route, which no
  // screen here can open: they land on the list, with the new ones.
  if (/^\/api\/certificates\/[^/]+\/download$/u.test(path)) return certificates();
  // The daily reminder opens the day's recall, a window over the site's
  // dashboard (?rappel=1), a screen of its own here: Révisions (/revisions),
  // where the older reminders, which pointed at the site's revisions page,
  // land as well. Read before the query is cut off below.
  if (path === "/dashboard" && /[?&]rappel=/u.test(actionUrl)) return { pathname: "/revisions" };
  switch (path) {
    case "/lessons":
    case "/notes":
    case "/my-class":
    case "/revisions":
    case "/friends":
    case "/duels":
    case "/tournaments":
    case "/paths":
    case "/leaderboard":
    case "/forum":
    case "/support":
    case "/locker":
    case "/changelog":
      return { pathname: path };
    // The dashboard is the Home tab. Its other addresses are windows over it
    // on the site (?settings=…), which the Home tab has no counterpart of.
    case "/dashboard":
      return query === "" ? { pathname: "/home" } : null;
    // The site's glossary has a French address, the app's screen an English one.
    case "/glossaire":
      return { pathname: "/glossary" };
    // The certificates and the badges are tabs of the site's profile, and
    // sub-tabs of the Profile screen here: a new notice names its tab
    // (/profile?tab=certificats), an older one the page it had before.
    case "/profile":
      return profileOn(tab);
    case "/certificates":
      return certificates();
    case "/badges":
      return { pathname: "/profile", params: { tab: profileSubParam("Badges") } };
    // A completed challenge points at the challenges. The tournaments are a
    // tab of them on the site (/challenges?tab=tournois), a screen here.
    case "/challenges":
      return tab === ("tournois" satisfies ChallengesTab)
        ? { pathname: "/tournaments" }
        : { pathname: "/challenges" };
    // Every moderation notice points at the record, a settings page on the site.
    case "/settings/moderation":
      return { pathname: "/moderation" };
    // A placement test the console reset points at the test: the last step of
    // the site's onboarding, a screen of its own here.
    case "/onboarding/placement-test":
      return { pathname: "/placement" };
    default:
      return null;
  }
}

/**
 * What a notification posted to the phone's tray carries, so that a tap on
 * it can open what it is about and mark its inbox row read: the row, the
 * account it was posted for, and the site's link.
 */
export interface DeviceNotificationData {
  id: string;
  userId: string;
  actionUrl: string | null;
}

/** The data of a tapped tray notification read back; null for one the app did not post. */
export function deviceNotificationData(data: unknown): DeviceNotificationData | null {
  if (typeof data !== "object" || data === null) return null;
  if (!("id" in data) || typeof data.id !== "string" || data.id === "") return null;
  if (!("userId" in data) || typeof data.userId !== "string" || data.userId === "") return null;
  const actionUrl =
    "actionUrl" in data && typeof data.actionUrl === "string" ? data.actionUrl : null;
  return { id: data.id, userId: data.userId, actionUrl };
}

/**
 * Where a tap on a tray notification leads: the screen it is about, or the
 * inbox for one that only needs reading, so that a tap never leaves the
 * reader where they were.
 */
export function tapRoute(actionUrl: string | null): InAppRoute | { pathname: "/notifications" } {
  return inAppRouteFor(actionUrl) ?? { pathname: "/notifications" };
}
