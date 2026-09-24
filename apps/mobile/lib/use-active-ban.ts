import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { activeBanOf, BAN_COLUMNS, type ActiveBan, type RawBanRow } from "@/lib/ban";

/**
 * The ban in force on this account, or null. Read again every few minutes and
 * whenever the app comes back to the foreground: a ban decided while the app
 * sat open should not wait for a restart to be shown. The server does not
 * wait at all; it refuses a banned account from the first request.
 */
export function useActiveBan(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["ban", userId],
    enabled: Boolean(userId),
    staleTime: 0,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<ActiveBan | null> => {
      const { data, error } = await supabase
        .from("user_bans")
        .select(BAN_COLUMNS)
        .eq("userId", userId as string) // gated by `enabled`
        .is("liftedAt", null)
        .order("createdAt", { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      // SAFETY: the columns selected above, in RawBanRow's shape.
      return activeBanOf((data ?? []) as unknown as RawBanRow[], new Date());
    },
  });

  const { refetch } = query;
  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => {
      subscription.remove();
    };
  }, [userId, refetch]);

  return query;
}
