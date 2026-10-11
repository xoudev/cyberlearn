import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

/**
 * A window of the site (a dialog, a drawer) whose open state is a parameter
 * of the address: `?news=1` open, no `news` closed.
 *
 * The address is what makes it behave like a page where that matters: a link
 * or a redirect can open it (/changelog lands on /dashboard?news=1), the
 * browser's Back closes it and Forward opens it again, and closing it leaves
 * nothing behind. The page under it does not move: the address changes
 * through the History API, which Next follows in useSearchParams without
 * asking the server for anything.
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
   * it again; a parameter that came with the address (a link, a redirect) is
   * taken off it instead, and Back leaves the page as it would have.
   */
  close: () => void;
}

/** The mark open() leaves on the history entry it adds. */
const OPENED = "queryDialog";

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

/** Whether the current history entry is the one open() added for this key. */
function openedHere(key: string): boolean {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && OPENED in state && state[OPENED] === key;
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
        window.history.replaceState(openedHere(key) ? { [OPENED]: key } : null, "", href);
        return;
      }
      window.history.pushState({ [OPENED]: key }, "", href);
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
