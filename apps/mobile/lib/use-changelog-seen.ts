import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { CHANGELOG_SEEN_KEY, LATEST_VERSION, hasUnseenChangelog } from "@/lib/changelog";

const KEY = ["changelog-seen"] as const;

/**
 * Whether the newest release notes are still unread on this device, and the
 * way to record them as read: kept on the phone, as the site keeps it in the
 * browser, under the same key.
 */
export function useChangelogSeen(): { unseen: boolean; markSeen: () => Promise<void> } {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<string | null> => {
      try {
        return await AsyncStorage.getItem(CHANGELOG_SEEN_KEY);
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
  });

  const markSeen = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(CHANGELOG_SEEN_KEY, LATEST_VERSION);
    } catch {
      // Storage refused: the mark stays until the next visit, nothing more.
    }
    queryClient.setQueryData(KEY, LATEST_VERSION);
  }, [queryClient]);

  // Unknown until read: no mark rather than a mark that flickers away.
  return { unseen: data !== undefined && hasUnseenChangelog(data), markSeen };
}
