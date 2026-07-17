"use client";

import { useEffect } from "react";
import { CHANGELOG_SEEN_KEY } from "@/lib/changelog/entries";

/**
 * Records the latest version the user has read, then broadcasts the change so
 * the sidebar "new" dot clears immediately (same-tab storage writes don't fire
 * the native `storage` event).
 */
export function MarkChangelogSeen({ version }: { version: string }): null {
  useEffect(() => {
    if (!version) return;
    try {
      localStorage.setItem(CHANGELOG_SEEN_KEY, version);
      window.dispatchEvent(new CustomEvent("cl-changelog-seen", { detail: version }));
    } catch {
      // storage disabled: the dot simply stays until a full reload
    }
  }, [version]);

  return null;
}
