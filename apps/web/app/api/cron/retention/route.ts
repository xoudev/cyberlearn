import { NextResponse } from "next/server";
import { purgeExpiredRecords } from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";

import { isAuthorizedCron } from "@/lib/cron-auth";

// Vercel Cron (see vercel.json), daily: deletes the records the privacy policy
// says are kept no longer (packages/db/src/rgpd/retention.ts). Idempotent: a
// missed day is caught up by the next run.
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed, in constant time: see lib/cron-auth.ts.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await purgeExpiredRecords(new Date());
    logger.info({ scope: "retention", ...summary }, "retention purge done");
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logger.error({ scope: "retention", err: errorMessage(err) }, "retention purge failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
