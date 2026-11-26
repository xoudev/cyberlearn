"use client";

// "use client" justification: it opens a window over the page, by the address,
// in the browser.

import React from "react";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import {
  NEW_REQUEST_QUERY,
  PAGE_REPORT_VALUE,
} from "@/app/(app)/support/_components/new-request-query";

/** What the button and the account tray say: one label for one gesture. */
export const REPORT_LABEL = "Signaler un souci";

/**
 * « Signaler un souci » in the navbar: the request window over the page the
 * reader is on, with that page already in it (new-request-dialog.tsx). The
 * site is in beta, and a bug is reported where it is seen or not at all.
 *
 * Hidden on a phone, where the bar is full: the account tray of the sidebar
 * carries the same entry there (sidebar-nav.tsx).
 */
export function ReportButton(): React.JSX.Element {
  const request = useQueryDialog(NEW_REQUEST_QUERY);
  return (
    <button
      type="button"
      className="navbar-icon-link navbar-report"
      title={REPORT_LABEL}
      aria-label={REPORT_LABEL}
      aria-haspopup="dialog"
      onClick={() => {
        request.open(PAGE_REPORT_VALUE);
      }}
    >
      {/* A speech bubble with an exclamation mark: something to say about
          what is wrong, not a generic help ring. */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
      >
        <path d="M4 4h16v12H10l-4 4v-4H4z" />
        <path d="M12 7.5v4.5M12 14v.5" />
      </svg>
    </button>
  );
}
