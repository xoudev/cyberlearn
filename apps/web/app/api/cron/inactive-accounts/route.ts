import { NextResponse } from "next/server";
import { errorMessage, logger } from "@cyberlearn/lib/logger";

import { isAuthorizedCron } from "@/lib/cron-auth";
import { failureCounts, trackCronRun } from "@/lib/cron-run";
import { runInactiveAccounts } from "@/lib/rgpd/inactive-accounts";

// Vercel Cron (see vercel.json), daily: erases the accounts inactive for 24
// months that were warned 30 days ago, then warns the next ones
// (lib/rgpd/inactive-accounts.ts). A missed night delays both, never shortens
// a notice.
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed, in constant time: see lib/cron-auth.ts.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // An account that could not be erased or warned leaves the others to go
    // through, and the run failed all the same.
    const summary = await trackCronRun("inactive-accounts", () => runInactiveAccounts(new Date()), {
      failure: (r) =>
        failureCounts([
          [r.erasureFailures, "effacement en échec", "effacements en échec"],
          [r.noticeFailures, "avis non envoyé", "avis non envoyés"],
        ]),
    });
    logger.info({ scope: "rgpd", ...summary }, "inactive accounts run done");
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logger.error({ scope: "rgpd", err: errorMessage(err) }, "inactive accounts run failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
