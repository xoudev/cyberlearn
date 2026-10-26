"use client";

// "use client" justification: it opens the review window over the page by
// the address, without a navigation (useQueryDialog).

import React from "react";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { DAILY_RAPPEL, RAPPEL_QUERY } from "./rappel-query";

/**
 * A button that opens the review window: the day's recall by default, a
 * module's review with `value` (moduleRappelValue). Server components draw
 * it where the window is offered: the dashboard, the path page.
 */
export function RappelButton({
  value = DAILY_RAPPEL,
  className,
  title,
  children,
}: {
  value?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const rappel = useQueryDialog(RAPPEL_QUERY);
  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={() => {
        rappel.open(value);
      }}
    >
      {children}
    </button>
  );
}
