/**
 * What the sidebar lists, and in what order, kept apart from how it is drawn.
 *
 * Three groups under the dashboard: what to learn, how it is going, who else is
 * here. The account block at the bottom says who is signed in and leads to the
 * profile, nothing more: the news and the settings are in the navbar, where the
 * other things that are not pages of the site already are.
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
  | "locker"
  | "trophy"
  | "forum"
  | "duel"
  | "classes"
  | "tournament"
  | "support";

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

  const community: SidebarItem[] = [
    { href: "/forum", label: "Forum", icon: "forum", count: null },
    { href: "/duels", label: "Duels", icon: "duel", count: null },
  ];
  if (input.hasClasses) {
    // A tournament brings classes together: without one, there is none to play.
    community.push(
      { href: "/my-class", label: "Mes classes", icon: "classes", count: null },
      { href: "/tournaments", label: "Tournois", icon: "tournament", count: null },
    );
  }
  // Help is somebody answering: it belongs with the people, not under the account.
  community.push({ href: "/support", label: "Aide", icon: "support", count: null });

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
        // The locker is what the levels unlock: a reward, listed with the others.
        { href: "/locker", label: "Casier", icon: "locker", count: null },
        { href: "/leaderboard", label: "Classement", icon: "trophy", count: null },
      ],
    },
    { key: "community", label: "Communauté", items: community },
  ];
}

/**
 * Whether `href` is the page being read. The dashboard matches itself only;
 * every other entry also owns the pages beneath it (/lessons/xyz is "Leçons").
 */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
