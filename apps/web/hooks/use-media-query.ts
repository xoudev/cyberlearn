import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the window matches a media query, kept up to date as it is resized.
 *
 * False on the server and on the first render that hydrates: the server does
 * not know the window, and the client's first render has to agree with it.
 * What depends on the answer should therefore be something the reader opens
 * (a drawer docked or over the page), not what the page first paints.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
