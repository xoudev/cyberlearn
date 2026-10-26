/**
 * What the sidebar lists, and in what order, kept apart from how it is drawn.
 *
 * The dashboard, then four groups: what to learn, how to practise, how it is
 * going, who else is here. The groups, their labels and their order are the
 * app's too (@cyberlearn/lib/navigation/groups, which its profile hub reads),
 * the icons the route registry's (lib/routes.ts). The account block at the
 * bottom says who is signed in; the news and the settings are in the navbar,
 * where the other things that are not pages of the site already are.
 */

import { navGroupsFor, type NavEntryKey } from "@cyberlearn/lib/navigation/groups";
import { DAILY_RAPPEL, RAPPEL_QUERY } from "@/components/rappel/rappel-query";
import { sidebarIconOf, type SidebarIcon } from "@/lib/routes";

export type { SidebarIcon } from "@/lib/routes";

export interface SidebarItem {
  href: string;
  label: string;
  icon: SidebarIcon;
  /** A number worth acting on, drawn next to the label; none otherwise. */
  count: number | null;
  /** What the count is, read out in place of the bare number. */
  countLabel?: string;
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
  /** Duel invitations waiting on the reader's answer. */
  duelInvitations: number;
}

/** Whether the entry is listed for this reader. */
function listed(key: NavEntryKey, input: SidebarInput): boolean {
  if (key === "revisions") return input.showRevisions;
  if (key === "classes") return input.hasClasses;
  return true;
}

function itemFor(
  entry: { key: NavEntryKey; label: string; href: string },
  input: SidebarInput,
): SidebarItem | null {
  // lib/__tests__/routes.test.ts keeps every page listed here in the registry
  // with an icon: none would mean a page the registry does not know.
  const icon = sidebarIconOf(entry.href);
  if (icon === null) return null;
  const item: SidebarItem = { href: entry.href, label: entry.label, icon, count: null };

  if (entry.key === "revisions") {
    // The day's recall, in its window. No count: what waits beyond today's
    // few questions is not a number anybody should be shown.
    item.opens = { query: RAPPEL_QUERY, value: DAILY_RAPPEL };
  }
  if (entry.key === "duels" && input.duelInvitations > 0) {
    // A friend waiting on an answer, for a day at most: worth a number.
    const n = input.duelInvitations;
    item.count = n;
    item.countLabel = `${String(n)} ${n > 1 ? "invitations" : "invitation"} en attente`;
  }
  return item;
}

export function sidebarGroups(input: SidebarInput): SidebarGroup[] {
  return navGroupsFor("web")
    .map((group) => ({
      key: group.key,
      label: group.label,
      items: group.entries
        .filter((entry) => listed(entry.key, input))
        .map((entry) => itemFor(entry, input))
        .filter((item) => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Whether `href` is the page being read. The dashboard matches itself only;
 * every other entry also owns the pages beneath it (/lessons/xyz is "Leçons").
 */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
