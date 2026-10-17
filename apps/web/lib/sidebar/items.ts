/**
 * What the sidebar lists, and in what order, kept apart from how it is drawn.
 *
 * Three groups under the dashboard: what to learn, how it is going, who else is
 * here. The account block at the bottom says who is signed in and leads to the
 * profile, nothing more: the news and the settings are in the navbar, where the
 * other things that are not pages of the site already are.
 */

import { DAILY_RAPPEL, RAPPEL_QUERY } from "@/components/rappel/rappel-query";

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
  /**
   * A window the entry opens over the page instead of leading to `href`
   * (`?<query>=<value>`, components/query-dialogs.ts). `href` still says
   * which pages the entry owns.
   */
  opens?: { query: string; value: string };
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
}

export function sidebarGroups(input: SidebarInput): SidebarGroup[] {
  const learn: SidebarItem[] = [
    { href: "/paths", label: "Parcours", icon: "route", count: null },
    { href: "/lessons", label: "Leçons", icon: "book", count: null },
  ];
  if (input.showRevisions) {
    // The day's recall, in its window. No count: what waits beyond today's
    // few questions is not a number anybody should be shown.
    learn.push({
      href: "/revisions",
      label: "Révisions",
      icon: "review",
      count: null,
      opens: { query: RAPPEL_QUERY, value: DAILY_RAPPEL },
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
    // The tournaments are a tab of the challenges (/challenges?tab=tournois),
    // open to everyone: the entry is the classes' alone.
    community.push({ href: "/my-class", label: "Mes classes", icon: "classes", count: null });
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
        // The badges and the certificates are tabs of the profile
        // (/profile?tab=badges|certificats), which the account block leads to.
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
