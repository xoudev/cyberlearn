import { prisma, wrappedRepository } from "@cyberlearn/db";
import { wrappedWindow, type WrappedPayload } from "@cyberlearn/lib";

/**
 * The year's recap for one person, when Wrapped is open.
 *
 * Building a payload means aggregating a year of somebody's activity, so it is
 * read when the recap is opened, never on every page. The window is decided
 * here, from the server's clock, rather than taken from the caller: out of
 * season, the answer is no matter who asks.
 *
 * Shared by the site's pop-up (wrapped-actions) and the app (/api/mobile/wrapped).
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity. Lives outside any "use server" module so it cannot be invoked with
 * an arbitrary userId.
 */

export type WrappedRecap =
  | {
      open: true;
      payload: WrappedPayload | null;
      /** The name on the shareable card. */
      handle: string;
      /** The year it recaps. */
      periodKey: string;
    }
  | {
      open: false;
      /** The year the closed page names, as the site's does. */
      periodKey: string;
      /** "YYYY-MM-DD" (Europe/Paris) when it next opens. */
      opensOn: string | null;
    };

export async function recapFor(userId: string, now: Date = new Date()): Promise<WrappedRecap> {
  const window = wrappedWindow(now);
  if (!window.open) return { open: false, periodKey: window.periodKey, opensOn: window.opensOn };

  const [payload, profile] = await Promise.all([
    wrappedRepository.buildPayload(userId, window.periodKey),
    prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true },
    }),
  ]);

  return {
    open: true,
    payload,
    handle: profile?.username ?? profile?.displayName ?? "moi",
    periodKey: window.periodKey,
  };
}
