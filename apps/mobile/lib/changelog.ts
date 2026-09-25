/**
 * The release notes in the app: the site's /changelog, from the same list
 * (@cyberlearn/lib/changelog/entries), with the same "new" mark until the
 * latest version has been opened on this device.
 */

export {
  CHANGELOG,
  CHANGELOG_SEEN_KEY,
  CHANGE_META,
  LATEST_VERSION,
  formatChangelogDate,
  hasUnseenChangelog,
  type ChangelogEntry,
} from "@cyberlearn/lib/changelog/entries";

export const CHANGELOG_COPY = {
  eyebrow: "Système · Notes de version",
  title: "Nouveautés",
  intro:
    "Chaque amélioration, nouveauté et correctif apporté à CyberLearn, de la version la plus récente à la plus ancienne.",
  latest: "Dernière",
  unseen: "nouveau",
} as const;
