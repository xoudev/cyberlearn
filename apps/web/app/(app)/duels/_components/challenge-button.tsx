"use client";

// "use client" justification: it opens the "Défier" window over the page, by
// the address, in the browser.

import React from "react";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { ANY_FRIEND, DUEL_QUERY } from "./duel-query";

/**
 * Opens the "Défier" window (challenge-dialog.tsx) over the page the reader
 * is on: from /duels with nobody picked, from a finished duel with the same
 * friend picked for the rematch.
 */
export function ChallengeButton({
  friendId = null,
  className,
  children,
}: {
  /** The friend to pick when the window opens, if any. */
  friendId?: string | null;
  className: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const duel = useQueryDialog(DUEL_QUERY);
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      onClick={() => {
        duel.open(friendId ?? ANY_FRIEND);
      }}
    >
      {children}
    </button>
  );
}
