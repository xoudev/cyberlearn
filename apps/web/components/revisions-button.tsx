"use client";

// "use client" justification: it opens the day's recall over the page by the
// address, without a navigation (useQueryDialog).

import React from "react";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { DAILY_RAPPEL, RAPPEL_QUERY } from "./rappel/rappel-query";
import "./revisions-button.css";

/**
 * The day's recall, as a button of the navbar.
 *
 * It was an entry of the sidebar, among the pages, though it leads to none:
 * it opens a window over the page being read (?rappel=1). It sits with the
 * other things that open over the page, next to the bell, which keeps it on
 * screen on a phone too, where the sidebar is a drawer.
 *
 * A square mark says the day's recall waits. Never a number: a count that only
 * grows while one is away is a reason not to come back (the dashboard's card
 * and the daily reminder say it the same way).
 */
export function RevisionsButton({ waiting }: { waiting: boolean }): React.JSX.Element {
  const rappel = useQueryDialog(RAPPEL_QUERY);
  return (
    <button
      type="button"
      className="navbar-icon-link navbar-revisions"
      title="Révisions du jour"
      aria-label={waiting ? "Révisions du jour, rappel à faire" : "Révisions du jour"}
      aria-haspopup="dialog"
      onClick={() => {
        rappel.open(DAILY_RAPPEL);
      }}
    >
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
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
      {waiting && <span className="navbar-revisions__mark" aria-hidden="true" />}
    </button>
  );
}
