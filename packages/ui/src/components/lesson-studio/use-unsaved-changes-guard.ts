import { useEffect, useRef } from "react";

/**
 * Asks before leaving a page with something typed and not saved.
 *
 * Two ways out are guarded. Closing or reloading the tab, and following a
 * link to another site, raise the browser's own "leave the page?" dialog
 * (beforeunload): its wording is the browser's, a page cannot set it. A link
 * inside the app never reaches beforeunload, since the router changes the
 * page without unloading it, so a click on one is caught first, on the
 * document while it captures, and confirmed with `message`. The browser's
 * back button stays unguarded: the router gives no way to hold it.
 */

/**
 * Whether following this link leaves the page for another page of the app:
 * the case beforeunload does not see. A new tab, a download, another site, or
 * an anchor on this same page are not.
 */
export function leavesForAppPage(link: HTMLAnchorElement, here: Location): boolean {
  if (link.target !== "" && link.target !== "_self") return false;
  if (link.hasAttribute("download")) return false;
  const href = link.getAttribute("href");
  if (href === null || href.startsWith("#")) return false;
  let url: URL;
  try {
    url = new URL(link.href, here.href);
  } catch {
    return false;
  }
  if (url.origin !== here.origin) return false;
  return url.pathname !== here.pathname || url.search !== here.search;
}

export function useUnsavedChangesGuard(dirty: boolean, message: string): void {
  const latest = useRef({ dirty, message });
  latest.current = { dirty, message };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (latest.current.dirty) event.preventDefault();
    };
    const onClick = (event: MouseEvent): void => {
      if (!latest.current.dirty || event.defaultPrevented) return;
      // A modified click opens another tab: this page stays.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || !leavesForAppPage(link, window.location)) return;
      if (window.confirm(latest.current.message)) return;
      // Before the router's own handler, which is further down: it never sees the click.
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}
