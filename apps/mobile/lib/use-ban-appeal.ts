import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { fetchBanAppealApi } from "@/lib/api";

/**
 * Where the appeal against the ban in force stands, with the team's last
 * answer, or null while none was filed.
 *
 * The appeal's ticket is closed to its own author by the ban gate, so the
 * answer cannot be read from the support screens; it comes from the ban
 * routes, which a banned account may still call. Read again every few minutes
 * and whenever the app comes back to the foreground, like the ban itself: an
 * answer written while the app sat open should not wait for a restart.
 *
 * `enabled` is whether an appeal exists, so an account that never appealed
 * makes no request.
 */
export function useBanAppeal(userId: string | undefined, enabled: boolean) {
  const query = useQuery({
    queryKey: ["ban-appeal", userId],
    enabled: Boolean(userId) && enabled,
    staleTime: 0,
    refetchInterval: 5 * 60_000,
    queryFn: fetchBanAppealApi,
  });

  const { refetch } = query;
  useEffect(() => {
    if (!userId || !enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refetch();
    });
    return () => {
      subscription.remove();
    };
  }, [userId, enabled, refetch]);

  return query;
}
