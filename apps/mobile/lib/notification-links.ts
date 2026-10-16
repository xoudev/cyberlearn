import { threadFromHref } from "./forum";
import { profileSubParam, type ProfileSubParam } from "./profile-tabs";

/**
 * Where a notification leads, in the app. The site stores a link to one of its
 * own pages on each notification (`actionUrl`); this finds the screen of the
 * app that shows the same thing, or null when there is none and the
 * notification only needs reading.
 */

export type InAppRoute =
  | { pathname: "/moderation" }
  | { pathname: "/forum/[category]/[topic]"; params: { category: string; topic: string } }
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
        | "/challenges";
    };

const SLUG = "([a-z0-9-]+)";

function certificates(): InAppRoute {
  return { pathname: "/profile", params: { tab: profileSubParam("Certificats") } };
}

export function inAppRouteFor(actionUrl: string | null): InAppRoute | null {
  if (actionUrl === null) return null;
  const path = actionUrl.split(/[?#]/u)[0]?.replace(/\/$/u, "") ?? "";

  const thread = threadFromHref(path);
  if (thread) {
    return {
      pathname: "/forum/[category]/[topic]",
      params: { category: thread.category, topic: thread.slug },
    };
  }
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
  switch (path) {
    case "/lessons":
    case "/notes":
    case "/my-class":
    case "/revisions":
    case "/profile":
    case "/friends":
    case "/duels":
    case "/tournaments":
    // A completed challenge points at the challenges.
    case "/challenges":
      return { pathname: path };
    // The certificates, like the badges, live under the profile tab, each
    // on its own sub-tab: the link names it, or the tab opens on the last one.
    case "/certificates":
      return certificates();
    case "/badges":
      return { pathname: "/profile", params: { tab: profileSubParam("Badges") } };
    // Every moderation notice points at the record, a settings page on the site.
    case "/settings/moderation":
      return { pathname: "/moderation" };
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
