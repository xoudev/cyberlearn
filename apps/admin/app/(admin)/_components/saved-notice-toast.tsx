"use client";

// "use client": it reads the address in the browser and rewrites it there.

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SAVED_PARAM, savedNoticeText, withoutSavedNotice } from "@/lib/saved-notice";

/**
 * Says what a save that redirected came to, then takes the flag off the
 * address (see lib/saved-notice.ts). The address is rewritten in place rather
 * than navigated to: the page under it is already the right one, and reading
 * it again for one parameter would cost a round trip.
 *
 * The toast has a fixed id, so the effect running twice in development, or
 * the same flag read again before the address changed, shows it once.
 */
export function SavedNoticeToast(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const flag = searchParams.get(SAVED_PARAM);

  useEffect(() => {
    if (flag === null) return;
    const text = savedNoticeText(flag);
    if (text !== null) toast.success(text, { id: "console-saved-notice" });
    window.history.replaceState(
      null,
      "",
      withoutSavedNotice(pathname, window.location.search) + window.location.hash,
    );
  }, [flag, pathname]);

  return null;
}
