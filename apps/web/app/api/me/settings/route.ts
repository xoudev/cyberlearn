import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { loadSettings } from "@/app/(app)/settings/_lib/load-settings";

/**
 * Every settings section of the caller, in one answer: what the settings
 * drawer opens with (app/(app)/settings/_components/SettingsDrawer.tsx).
 *
 * The same loaders as the full pages, so the drawer shows what the page
 * shows. Signed-in only, the caller's own rows only, never stored on the way
 * (private, no-store). A banned account is refused here as it is sent away
 * from the pages.
 */
export async function GET(): Promise<Response> {
  const user = await getRequestUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (await getActiveBan()) {
    return Response.json({ error: "banned" }, { status: 403 });
  }

  try {
    const settings = await loadSettings(user);
    return Response.json(settings, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    logger.error({ scope: "settings", err: errorMessage(err) }, "settings drawer load failed");
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
