/**
 * The sections of the product, grouped as the site's sidebar and the app's
 * hub (the "Explorer" list of the Profile tab) show them: one order, one set
 * of labels, so a learner who knows where a page sits on one finds it in the
 * same group on the other.
 *
 * Each entry says where it lives on each side: `web` is the site's address,
 * `mobile` the app's route, null where that side has no such place. The site
 * lists the entries that have an address; the app lists the ones it has a
 * screen for, leaving out its own tabs, which are always on screen. What
 * reaches an entry (an icon, a count, a window it opens) is each side's own:
 * apps/web/lib/routes.ts and lib/sidebar/items.ts on the site,
 * apps/mobile/lib/hub.ts in the app.
 *
 * Plain data, no import: React Native and the Edge runtime read it as well
 * as the site's server.
 */

export type NavGroupKey = "home" | "learn" | "practice" | "progress" | "community" | "account";

export type NavEntryKey =
  | "dashboard"
  | "paths"
  | "lessons"
  | "revisions"
  | "notes"
  | "glossary"
  | "challenges"
  | "duels"
  | "tournaments"
  | "profile"
  | "leaderboard"
  | "locker"
  | "forum"
  | "classes"
  | "support"
  | "friends"
  | "offline"
  | "notifications"
  | "moderation"
  | "settings"
  | "changelog";

export interface NavEntry {
  /** What code singles an entry out by: a count, a condition, an icon. */
  key: NavEntryKey;
  label: string;
  /** The site's address, or null when the site has no page for it. */
  web: string | null;
  /** The app's route, or null when the app has no screen for it. */
  mobile: string | null;
}

export interface NavGroup {
  key: NavGroupKey;
  /** The group's heading; null for the dashboard, which stands alone. */
  label: string | null;
  entries: readonly NavEntry[];
}

export type NavPlatform = "web" | "mobile";

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    key: "home",
    label: null,
    entries: [{ key: "dashboard", label: "Tableau de bord", web: "/dashboard", mobile: "/home" }],
  },
  {
    key: "learn",
    label: "Apprendre",
    entries: [
      { key: "paths", label: "Parcours", web: "/paths", mobile: "/paths" },
      { key: "lessons", label: "Leçons", web: "/lessons", mobile: "/lessons" },
      // A window over the page on the site (?rappel=1), not a page: its
      // button sits in the top bar, beside the bell. A screen in the app.
      { key: "revisions", label: "Révisions", web: null, mobile: "/revisions" },
      { key: "notes", label: "Bloc-notes", web: "/notes", mobile: "/notes" },
      { key: "glossary", label: "Glossaire", web: "/glossaire", mobile: "/glossary" },
    ],
  },
  {
    key: "practice",
    label: "S'entraîner",
    entries: [
      { key: "challenges", label: "Défis", web: "/challenges", mobile: "/challenges" },
      { key: "duels", label: "Duels", web: "/duels", mobile: "/duels" },
      // A tab of the challenges on the site (/challenges?tab=tournois); a
      // screen of its own in the app, the native pattern.
      { key: "tournaments", label: "Tournois", web: null, mobile: "/tournaments" },
    ],
  },
  {
    key: "progress",
    label: "Progression",
    entries: [
      // In the app the hub sits on the profile itself.
      { key: "profile", label: "Mon profil", web: "/profile", mobile: null },
      { key: "leaderboard", label: "Classement", web: "/leaderboard", mobile: "/leaderboard" },
      { key: "locker", label: "Casier", web: "/locker", mobile: "/locker" },
    ],
  },
  {
    key: "community",
    label: "Communauté",
    entries: [
      { key: "forum", label: "Forum", web: "/forum", mobile: "/forum" },
      { key: "classes", label: "Mes classes", web: "/my-class", mobile: "/my-class" },
      // Help is somebody answering: it belongs with the people.
      { key: "support", label: "Aide", web: "/support", mobile: "/support" },
    ],
  },
  {
    // The site keeps these in its top bar (the friends' panel, the bell, the
    // settings and the news windows), where the things that are not pages are.
    key: "account",
    label: "Compte",
    entries: [
      { key: "friends", label: "Amis", web: null, mobile: "/friends" },
      { key: "offline", label: "Hors ligne", web: null, mobile: "/offline" },
      { key: "notifications", label: "Notifications", web: null, mobile: "/notifications" },
      { key: "moderation", label: "Ma modération", web: null, mobile: "/moderation" },
      { key: "settings", label: "Réglages", web: null, mobile: "/settings" },
      { key: "changelog", label: "Nouveautés", web: null, mobile: "/changelog" },
    ],
  },
];

/** An entry as one side lists it: where it leads there. */
export interface PlatformNavEntry {
  key: NavEntryKey;
  label: string;
  href: string;
}

export interface PlatformNavGroup {
  key: NavGroupKey;
  label: string | null;
  entries: PlatformNavEntry[];
}

/**
 * The groups as one side lists them: the entries it has a place for, in the
 * shared order, and no group left empty.
 */
export function navGroupsFor(
  platform: NavPlatform,
  groups: readonly NavGroup[] = NAV_GROUPS,
): PlatformNavGroup[] {
  const out: PlatformNavGroup[] = [];
  for (const group of groups) {
    const entries: PlatformNavEntry[] = [];
    for (const entry of group.entries) {
      const href = entry[platform];
      if (href !== null) entries.push({ key: entry.key, label: entry.label, href });
    }
    if (entries.length > 0) out.push({ key: group.key, label: group.label, entries });
  }
  return out;
}
