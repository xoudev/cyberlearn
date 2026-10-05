/**
 * What the sidebar lists, and in what order, kept apart from how it is drawn.
 *
 * Three groups under the dashboard: what to learn, how it is going, who else is
 * here. Profile, locker, news, help and settings are not navigation in the same
 * sense - nobody opens the site to go to the settings - so they sit in the
 * account block at the bottom, not in the list.
 */

export type SidebarIcon =
  | "dashboard"
  | "route"
  | "book"
  | "review"
  | "flash"
  | "note"
  | "badge"
  | "cert"
  | "trophy"
  | "forum"
  | "classes";

export type AccountIcon = "locker" | "news" | "support" | "settings";

export interface SidebarItem {
  href: string;
  label: string;
  icon: SidebarIcon;
  /** A number worth acting on, drawn next to the label; none otherwise. */
  count: number | null;
}

export interface SidebarGroup {
  key: string;
  /** The group's heading; null for the dashboard, which stands alone. */
  label: string | null;
  items: SidebarItem[];
}

export interface SidebarInput {
  /** Teaching one or being in one: either opens the classes page. */
  hasClasses: boolean;
  /** False once spaced repetition is switched off in the settings. */
  showRevisions: boolean;
  /** Revisions due right now: the one count that calls for an action. */
  dueReviews: number;
}

export function sidebarGroups(input: SidebarInput): SidebarGroup[] {
  const learn: SidebarItem[] = [
    { href: "/paths", label: "Parcours", icon: "route", count: null },
    { href: "/lessons", label: "Leçons", icon: "book", count: null },
  ];
  if (input.showRevisions) {
    learn.push({
      href: "/revisions",
      label: "Révisions",
      icon: "review",
      count: input.dueReviews > 0 ? input.dueReviews : null,
    });
  }
  learn.push(
    { href: "/challenges", label: "Défis", icon: "flash", count: null },
    { href: "/notes", label: "Bloc-notes", icon: "note", count: null },
  );

  const community: SidebarItem[] = [{ href: "/forum", label: "Forum", icon: "forum", count: null }];
  if (input.hasClasses) {
    community.push({ href: "/my-class", label: "Mes classes", icon: "classes", count: null });
  }

  return [
    {
      key: "home",
      label: null,
      items: [{ href: "/dashboard", label: "Tableau de bord", icon: "dashboard", count: null }],
    },
    { key: "learn", label: "Apprendre", items: learn },
    {
      key: "progress",
      label: "Progression",
      items: [
        { href: "/badges", label: "Badges", icon: "badge", count: null },
        { href: "/certificates", label: "Certificats", icon: "cert", count: null },
        { href: "/leaderboard", label: "Classement", icon: "trophy", count: null },
      ],
    },
    { key: "community", label: "Communauté", items: community },
  ];
}

/** The account block's small links, in order. */
export const ACCOUNT_LINKS: readonly { href: string; label: string; icon: AccountIcon }[] = [
  { href: "/locker", label: "Casier", icon: "locker" },
  { href: "/changelog", label: "Nouveautés", icon: "news" },
  { href: "/support", label: "Aide", icon: "support" },
  { href: "/settings", label: "Paramètres", icon: "settings" },
];

/**
 * Whether `href` is the page being read. The dashboard matches itself only;
 * every other entry also owns the pages beneath it (/lessons/xyz is "Leçons").
 */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
