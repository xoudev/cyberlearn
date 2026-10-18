/**
 * The site's routes, once: which need a session, which crawlers stay off,
 * which the sidebar lists and with what icon.
 *
 * Three lists used to say it, each by hand. The middleware's protected
 * prefixes, robots.txt's own copy, which missed /forum, /support, /my-class,
 * /duels and /tournaments as they were added (crawlers indexed the login page
 * under five more names), and the sidebar's entries. They are read off this
 * one now: middleware.ts asks isProtectedRoute, app/robots.ts lists
 * ROBOTS_DISALLOWED, lib/sidebar/items.ts asks sidebarIconOf. The sidebar's
 * labels, groups and order are the app's too (@cyberlearn/lib/navigation/groups).
 *
 * A page added under app/(app) without a line here fails
 * lib/__tests__/routes.test.ts, which walks the folder.
 *
 * Plain data, no import: the middleware runs on the Edge runtime.
 */

/** The sidebar's icons (components/sidebar-nav.tsx draws them). */
export type SidebarIcon =
  | "dashboard"
  | "route"
  | "book"
  | "review"
  | "note"
  | "glossary"
  | "flash"
  | "duel"
  | "profile"
  | "trophy"
  | "locker"
  | "forum"
  | "classes"
  | "support";

export interface AppRoute {
  /** The address; every address beneath it goes with it. */
  href: string;
  /** A visitor without a session is sent to the login, and back after. */
  protected: boolean;
  /** robots.txt keeps crawlers off it and everything beneath it. */
  disallow: boolean;
  /** Its icon in the sidebar, which lists it; null when it does not. */
  icon: SidebarIcon | null;
}

/** A page of the app: behind the login, and none of a crawler's business. */
function signedIn(href: string, icon: SidebarIcon | null = null): AppRoute {
  return { href, protected: true, disallow: true, icon };
}

/**
 * Not behind the login, but none of a crawler's business: an address
 * next.config redirects before the middleware ever sees it (a window over the
 * dashboard, a tab of another page), the account flows a link in an e-mail
 * opens without a session, the JSON of /api.
 */
function notForCrawlers(href: string): AppRoute {
  return { href, protected: false, disallow: true, icon: null };
}

/**
 * A sidebar entry that opens a window over the page instead of leading to one
 * (lib/sidebar/items.ts): the sidebar lists it under its address, with its
 * icon, and the address itself is a redirect to the window (next.config), so
 * there is no page behind it to guard.
 */
function opensWindow(href: string, icon: SidebarIcon): AppRoute {
  return { href, protected: false, disallow: true, icon };
}

export const APP_ROUTES: readonly AppRoute[] = [
  signedIn("/dashboard", "dashboard"),
  signedIn("/paths", "route"),
  signedIn("/lessons", "book"),
  // The day's recall, a window over the page (?rappel=1).
  opensWindow("/revisions", "review"),
  signedIn("/notes", "note"),
  // Public, like the catalogue: a definition is worth reading before signing
  // up too, and the sitemap offers it. Signed in, its layout draws the app
  // around it (app/glossaire/layout.tsx).
  { href: "/glossaire", protected: false, disallow: false, icon: "glossary" },
  signedIn("/challenges", "flash"),
  signedIn("/duels", "duel"),
  // A tournament's own pages. The list is the Tournois tab of the challenges,
  // which /tournaments redirects to.
  signedIn("/tournaments"),
  signedIn("/profile", "profile"),
  signedIn("/leaderboard", "trophy"),
  signedIn("/locker", "locker"),
  signedIn("/forum", "forum"),
  signedIn("/my-class", "classes"),
  signedIn("/support", "support"),
  // Reached from the top bar while the year's review is open.
  signedIn("/wrapped"),
  // Under (auth), with its own layout: the steps before the app opens.
  signedIn("/onboarding"),

  // Windows over the dashboard now.
  notForCrawlers("/settings"),
  notForCrawlers("/changelog"),
  // Tabs of the profile now.
  notForCrawlers("/badges"),
  notForCrawlers("/certificates"),
  // An older address of the retired SM-2 queue, sent on to the day's recall.
  notForCrawlers("/review"),
  // Account flows and the API.
  notForCrawlers("/account"),
  notForCrawlers("/auth"),
  notForCrawlers("/api"),
];

function owns(prefix: string, pathname: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The addresses the middleware sends a visitor without a session from. */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = APP_ROUTES.filter(
  (route) => route.protected,
).map((route) => route.href);

/** Whether `pathname` needs a session: one of the prefixes, or beneath one. */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => owns(prefix, pathname));
}

const DISALLOWED_HREFS = APP_ROUTES.filter((route) => route.disallow).map((route) => route.href);

/**
 * What robots.txt disallows: the pages beneath each address, then the
 * address itself.
 */
export const ROBOTS_DISALLOWED: readonly string[] = [
  ...DISALLOWED_HREFS.map((href) => `${href}/`),
  ...DISALLOWED_HREFS,
];

/** The sidebar's icon for the page at `href`; null when the sidebar does not list it. */
export function sidebarIconOf(href: string): SidebarIcon | null {
  return APP_ROUTES.find((route) => route.href === href)?.icon ?? null;
}
