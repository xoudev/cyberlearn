"use client";

// "use client" justification: a window over the page, opened and closed by
// the address in the browser; opening it records the read on this device.

import React, { useEffect } from "react";
import { SideDrawer } from "@cyberlearn/ui";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";
import { CHANGELOG, LATEST_VERSION } from "@/lib/changelog/entries";
import { ChangelogTimeline } from "./changelog-timeline";
import { markChangelogSeen } from "./mark-seen";

/**
 * The release notes, in a drawer over whatever page the reader is on.
 *
 * They were a page of their own, /changelog, and reading them meant leaving
 * what one was doing. The navbar's Nouveautés button opens them here instead
 * (?news=1, registered in components/query-dialogs.ts), and the old address
 * is redirected to /dashboard?news=1 (next.config.ts).
 *
 * Opening it marks the latest version read on this device, as the page did,
 * so the button's mark clears.
 */
export default function NewsDrawer({ onClose }: QueryDialogProps): React.JSX.Element {
  useEffect(() => {
    markChangelogSeen(LATEST_VERSION);
  }, []);

  return (
    <SideDrawer
      open
      onClose={onClose}
      title="Nouveautés"
      meta={`v${LATEST_VERSION}`}
      closeLabel="Fermer les nouveautés"
      width={640}
    >
      <ChangelogTimeline entries={CHANGELOG} />
    </SideDrawer>
  );
}
