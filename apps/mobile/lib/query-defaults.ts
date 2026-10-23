import type { DefaultOptions } from "@tanstack/react-query";

/**
 * The settings of the app's query client, kept apart from the layout that
 * builds it so that a test can run the same ones.
 */
export const QUERY_DEFAULT_OPTIONS = {
  queries: {
    retry: 1,
    staleTime: 120_000,
    gcTime: 10 * 60_000,
    // Off by default: a query that wants it asks (the day's recall does), now
    // that the app's coming back to the front is what "focus" means.
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // A poll (`refetchInterval`) only runs while the app counts as focused,
    // and focus follows the app state (lib/app-focus.ts). The polls were
    // written for an app that always counted as focused: the inbox read every
    // minute is what the phone's tray mirrors, which is for when the app is
    // not in front. They keep running as they did.
    refetchIntervalInBackground: true,
  },
} satisfies DefaultOptions;
