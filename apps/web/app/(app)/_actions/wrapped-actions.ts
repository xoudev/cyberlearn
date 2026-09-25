"use server";

import type { WrappedPayload } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { recapFor } from "@/lib/wrapped/recap";

/**
 * The recap, read when the pop-up is opened rather than on every page load:
 * the session, then the service the app uses too (@/lib/wrapped/recap), which
 * re-reads the window itself. All the navbar needs is the date, which is free.
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
  const recap = await recapFor(user.id);
  if (!recap.open) return { ok: false };
  return { ok: true, payload: recap.payload, handle: recap.handle, periodKey: recap.periodKey };
}
