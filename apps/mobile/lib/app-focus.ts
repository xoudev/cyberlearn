import { focusManager } from "@tanstack/react-query";

/**
 * The part of react-native's AppState this needs, so that the binding below
 * runs under Vitest without the native module.
 */
export interface AppStateSource {
  addEventListener(type: "change", listener: (status: string) => void): { remove(): void };
}

/**
 * Tells TanStack Query when the app is in front. A phone has no browser tab
 * to focus: left alone, the query client never learns that the app came back
 * from the background, and a screen kept in memory (the home tab stays mounted
 * between two openings) goes on showing what it read yesterday. With this, a
 * query that opts in with `refetchOnWindowFocus` is read again as the app
 * comes back, if its data is stale by then (the client's `staleTime`); one
 * that does not opt in is left as it was, the client's default being off.
 *
 * A poll (`refetchInterval`) is the other thing that reads the focus: it only
 * runs while the app counts as focused, so with this binding every poll would
 * stop as the app leaves the front, the inbox's one included, which the
 * phone's tray mirrors. The client's `refetchIntervalInBackground`
 * (lib/query-defaults.ts) keeps them running, as they did before.
 *
 * Called once, when the app starts; a second call replaces the first.
 */
export function bindFocusToAppState(appState: AppStateSource): void {
  focusManager.setEventListener((handleFocus) => {
    const subscription = appState.addEventListener("change", (status) => {
      handleFocus(status === "active");
    });
    return () => {
      subscription.remove();
    };
  });
}
