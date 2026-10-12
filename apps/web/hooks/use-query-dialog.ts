import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

/**
 * A window of the site (a dialog, a drawer) whose open state is a parameter
 * of the address: `?<key>=<value>` open, no `<key>` closed.
 *
 * The address is what makes it behave like a page where that matters: a link
 * or a redirect can open it (/settings/<section> lands on
 * /dashboard?settings=<section>), the browser's Back closes it and Forward
 * opens it again, and closing it leaves nothing behind. The page under it
 * does not move: the address changes through the History API, which Next
 * follows in useSearchParams without asking the server for anything.
 *
 * A window that should open on any page is registered in
 * components/query-dialogs.ts and drawn by the layout's QueryDialogHost. One
 * that belongs to a single page calls this hook there and draws itself.
 * docs/dev/dialogs.md says which windows are windows and which are pages.
 */

/** What a registered window is given by the host. */
export interface QueryDialogProps {
  /** The parameter's value: "1" for `?news=1`, the id for `?ticket=<id>`. */
  value: string;
  /** Closes it: the parameter leaves the address. */
  onClose: () => void;
}

export interface QueryDialog {
  /** The parameter's value while it is open, null while it is closed. */
  value: string | null;
  /** Opens it, as a new step of the history: Back closes it. */
  open: (value?: string) => void;
  /**
   * Closes it. The step open() added is stepped back over, so Forward opens
   * it again; a parameter that came with the address (a link, a redirect, a
   * reload) is taken off it instead, and Back leaves the page as it would have.
   */
  close: () => void;
}

/**
 * The mark open() leaves on the history entry it adds: the key it opened and
 * the document (the page load) that added it.
 */
const OPENED = "queryDialog";

interface OpenedMark {
  key: string;
  doc: string;
}

let docId: string | null = null;

/**
 * This document, told apart from the other page loads of the tab. A reload
 * keeps the entry open() added, mark included, but the entry before it
 * belongs to the document the reload threw away: stepping back to it would
 * ask the server for that page again. Drawn on first use, in the browser.
 */
function thisDocument(): string {
  docId ??= Math.random().toString(36).slice(2);
  return docId;
}

function markFor(key: string): Record<typeof OPENED, OpenedMark> {
  return { [OPENED]: { key, doc: thisDocument() } };
}

function markOf(state: unknown): OpenedMark | null {
  if (typeof state !== "object" || state === null || !(OPENED in state)) return null;
  const mark: unknown = state[OPENED];
  if (typeof mark !== "object" || mark === null) return null;
  if (!("key" in mark) || typeof mark.key !== "string") return null;
  if (!("doc" in mark) || typeof mark.doc !== "string") return null;
  return { key: mark.key, doc: mark.doc };
}

/**
 * The step open() added last, kept here as well as on the entry. Next does
 * not keep the mark: a refresh, a server action that revalidates and every
 * navigation it commits rewrite the entry's state with its own alone. This
 * record lives in the document's memory, so it cannot outlive it either.
 *
 * It is matched on the address and on the length of the history. The length
 * is what tells the step apart from a later entry at the same address: after
 * a step back, a navigation elsewhere and a link to that address again, the
 * entry before is not the page the window opened over. (Past the browsers'
 * cap of fifty entries the length no longer grows, and that case can slip
 * through.)
 */
let pushed: { key: string; href: string; length: number } | null = null;

function remember(key: string): void {
  pushed = { key, href: window.location.href, length: window.history.length };
}

/** The address with the parameter set, or taken off for null; the rest kept. */
export function addressWith(href: string, key: string, value: string | null): string {
  const url = new URL(href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function inAddress(key: string): boolean {
  return new URLSearchParams(window.location.search).has(key);
}

/**
 * Whether the current history entry is the step open() added for this key,
 * in this document: the one entry it is safe to step back from.
 */
function openedHere(key: string): boolean {
  const mark = markOf(window.history.state);
  // The entry's own mark has the last word: one left by another document
  // never sends the reader back into a page that is gone.
  if (mark !== null) return mark.key === key && mark.doc === thisDocument();
  return (
    pushed !== null &&
    pushed.key === key &&
    pushed.href === window.location.href &&
    pushed.length === window.history.length
  );
}

/**
 * A step back asked for and not taken yet. Escape held down, or a click on the
 * close button right after it, must not step back a second time, out of the
 * page.
 */
let steppingBack = false;

export function useQueryDialog(key: string): QueryDialog {
  const value = useSearchParams().get(key);

  // The history calls pass no state of the page's own (null, or the mark
  // alone): Next adds its own to it, and that is how it hears the change.
  const open = useCallback(
    (next = "1"): void => {
      const href = addressWith(window.location.href, key, next);
      if (inAddress(key)) {
        // Already open: the new value takes the old one's place.
        const here = openedHere(key);
        window.history.replaceState(here ? markFor(key) : null, "", href);
        if (here) remember(key);
        return;
      }
      window.history.pushState(markFor(key), "", href);
      remember(key);
    },
    [key],
  );

  const close = useCallback((): void => {
    if (!inAddress(key)) return;
    if (openedHere(key)) {
      if (steppingBack) return;
      steppingBack = true;
      window.addEventListener(
        "popstate",
        () => {
          steppingBack = false;
        },
        { once: true },
      );
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", addressWith(window.location.href, key, null));
  }, [key]);

  return { value, open, close };
}
