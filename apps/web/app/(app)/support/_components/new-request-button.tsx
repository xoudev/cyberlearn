"use client";

// "use client" justification: it opens the request window over the page, by
// the address, in the browser.

import React from "react";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { NEW_REQUEST_QUERY } from "./new-request-query";

/**
 * Opens the "Nouvelle demande" window (new-request-dialog.tsx) over the page
 * the reader is on, instead of sending them to the public contact page.
 */
export function NewRequestButton({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const request = useQueryDialog(NEW_REQUEST_QUERY);
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      onClick={() => {
        request.open();
      }}
    >
      {children}
    </button>
  );
}
