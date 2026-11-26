import { NextResponse } from "next/server";
import { errorMessage, logger } from "@cyberlearn/lib/logger";

import { isAuthorizedCron } from "@/lib/cron-auth";
import { failureCounts, trackCronRun } from "@/lib/cron-run";
import { runFirstWeek } from "@/lib/onboarding/first-week";

// Vercel Cron (see vercel.json), daily at 09:00 UTC, mid-morning in Paris:
// the first week's e-mails, day 1, day 3 and day 7 after sign-up
// (lib/onboarding/first-week.ts).
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed, in constant time: see lib/cron-auth.ts.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // An e-mail that could not go leaves the others to go out, and the run
    // failed all the same; the next run tries it again.
    const summary = await trackCronRun("onboarding-emails", () => runFirstWeek(new Date()), {
      failure: (r) => failureCounts([[r.failed, "e-mail non envoyé", "e-mails non envoyés"]]),
    });
    logger.info({ scope: "onboarding-emails", ...summary }, "first week run done");
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logger.error({ scope: "onboarding-emails", err: errorMessage(err) }, "first week run failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
