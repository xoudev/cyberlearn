import { threadFromHref } from "./forum";

/**
 * Where a notification leads, in the app. The site stores a link to one of its
 * own pages on each notification (`actionUrl`); this finds the screen of the
 * app that shows the same thing, or null when there is none and the
 * notification only needs reading.
 */

export type InAppRoute =
  | { pathname: "/forum/[category]/[topic]"; params: { category: string; topic: string } }
  | { pathname: "/lessons/[slug]"; params: { slug: string } }
  | { pathname: "/paths/[slug]"; params: { slug: string } }
  | { pathname: "/u/[username]"; params: { username: string } }
  | { pathname: "/lessons" | "/notes" | "/my-class" | "/profile" | "/revisions" | "/friends" };

const SLUG = "([a-z0-9-]+)";

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

  switch (path) {
    case "/lessons":
    case "/notes":
    case "/my-class":
    case "/revisions":
    case "/profile":
    case "/friends":
      return { pathname: path };
    // The badges live under the profile tab in the app.
    case "/badges":
      return { pathname: "/profile" };
    default:
      return null;
  }
}
