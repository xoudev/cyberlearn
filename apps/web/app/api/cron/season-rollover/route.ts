import { NextResponse } from "next/server";
import { rolloverDueSeasons } from "@/lib/league/rollover";

import { isAuthorizedCron } from "@/lib/cron-auth";

// Vercel Cron (see vercel.json): closes any ACTIVE season past its end and opens
// the next, promoting/relegating each pod. Idempotent - safe to run repeatedly,
// and the lazy fallback on the league page covers a missed run.
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed, in constant time: see lib/cron-auth.ts.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = await rolloverDueSeasons(now);
  const finalized = results.filter((r) => r.finalized);

  return NextResponse.json({
    ok: true,
    seasonsFinalized: finalized.length,
    details: finalized.map((r) => ({
      season: r.seasonIndex,
      members: r.members,
      promoted: r.promoted,
      relegated: r.relegated,
      next: r.nextSeasonIndex,
    })),
  });
}
