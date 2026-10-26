import { navGroupsFor, type NavEntryKey } from "@cyberlearn/lib/navigation/groups";

/**
 * The hub of the Profile tab: every screen the tab bar does not lead to, in
 * the groups of the site's sidebar (@cyberlearn/lib/navigation/groups), so a
 * learner finds a page under the same heading on both. The entries that are
 * the app's own (friends, offline lessons, notifications, moderation,
 * settings, news) close it, under « Compte »: the site keeps those in its top
 * bar.
 */

/** The tab bar's screens: always on screen, so the hub does not list them again. */
export const TAB_ROUTES: ReadonlySet<string> = new Set(["/home", "/paths", "/lessons", "/profile"]);

export interface HubLink {
  key: NavEntryKey;
  label: string;
  route: string;
}

export interface HubSection {
  key: string;
  title: string;
  links: HubLink[];
}

export function hubSections(): HubSection[] {
  const sections: HubSection[] = [];
  for (const group of navGroupsFor("mobile")) {
    const links = group.entries
      .filter((entry) => !TAB_ROUTES.has(entry.href))
      .map((entry) => ({ key: entry.key, label: entry.label, route: entry.href }));
    // The dashboard's group holds the home tab alone, and goes with it.
    if (links.length > 0) {
      sections.push({ key: group.key, title: group.label ?? "Explorer", links });
    }
  }
  return sections;
}
