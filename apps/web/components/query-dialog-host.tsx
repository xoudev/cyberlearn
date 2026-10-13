"use client";

// "use client" justification: the windows it draws are opened and closed by
// the address in the browser, without a navigation.

import React, { Suspense } from "react";
import { useQueryDialog, type QueryDialogProps } from "@/hooks/use-query-dialog";
import { QUERY_DIALOGS } from "./query-dialogs";

/**
 * Draws the window the address asks for (`?<key>=<value>`, keys in
 * components/query-dialogs.ts) over whatever page is shown. Mounted once, in
 * the app shell (components/app-shell.tsx).
 *
 * The boundary keeps the page from waiting on the address. It also delays
 * the windows' first effects past the commit where Next takes over the
 * History API, so the parameter of an address the site was opened on is
 * taken off through Next, which then hears of it.
 */
export function QueryDialogHost(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      {Object.entries(QUERY_DIALOGS).map(([key, Dialog]) => (
        <QueryDialogSlot key={key} name={key} Dialog={Dialog} />
      ))}
    </Suspense>
  );
}

function QueryDialogSlot({
  name,
  Dialog,
}: {
  name: string;
  Dialog: React.ComponentType<QueryDialogProps>;
}): React.JSX.Element | null {
  const { value, close } = useQueryDialog(name);
  if (value === null) return null;
  // A window whose code is still on its way shows nothing until it arrives.
  return (
    <Suspense fallback={null}>
      <Dialog value={value} onClose={close} />
    </Suspense>
  );
}
