import { CHANGELOG_SEEN_KEY } from "@/lib/changelog/entries";

/**
 * Said in this tab when the notes have been read: a storage write fires the
 * native `storage` event in the other tabs only.
 */
export const CHANGELOG_SEEN_EVENT = "cl-changelog-seen";

/**
 * Records the latest version the reader has seen on this device, then
 * broadcasts it, so the mark on the navbar's button clears at once.
 */
export function markChangelogSeen(version: string): void {
  if (!version) return;
  try {
    localStorage.setItem(CHANGELOG_SEEN_KEY, version);
    window.dispatchEvent(new CustomEvent(CHANGELOG_SEEN_EVENT, { detail: version }));
  } catch {
    // Storage disabled: the mark simply stays until a full reload.
  }
}
