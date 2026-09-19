"use server";

import { prisma, wrappedRepository } from "@cyberlearn/db";
import type { WrappedPayload } from "@cyberlearn/lib";
import { wrappedWindow } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";

/**
 * The recap, read when the pop-up is opened rather than on every page load.
 *
 * Building a payload means aggregating a year of somebody's activity. The
 * navbar renders on every signed-in page, so doing that there would charge
 * every page for a recap almost nobody is looking at right then. All the navbar
 * needs is the date, which is free; this is the rest, and it is asked for once,
 * on the click.
 *
 * The window is re-read here rather than taken from the caller. It reaches the
 * chip as a prop, and a prop is a thing a browser can send back whatever it
 * likes for - out of season, the answer is no matter who asks.
 */

export interface WrappedResult {
  ok: boolean;
  payload?: WrappedPayload | null;
  handle?: string;
  /** The year it recaps, so the pop-up can name it. */
  periodKey?: string;
}

export async function getWrappedAction(): Promise<WrappedResult> {
  const user = await requireRequestUser();
  const window = wrappedWindow(new Date());
  if (!window.open) return { ok: false };

  const [payload, profile] = await Promise.all([
    wrappedRepository.buildPayload(user.id, window.periodKey),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, displayName: true },
    }),
  ]);

  return {
    ok: true,
    payload,
    handle: profile?.username ?? profile?.displayName ?? "moi",
    periodKey: window.periodKey,
  };
}
