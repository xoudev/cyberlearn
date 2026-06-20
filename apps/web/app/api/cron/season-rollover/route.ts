import { NextResponse } from "next/server";
import { rolloverDueSeasons } from "@/lib/league/rollover";

// Vercel Cron (see vercel.json): closes any ACTIVE season past its end and opens
// the next, promoting/relegating each pod. Idempotent - safe to run repeatedly,
// and the lazy fallback on the league page covers a missed run.
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
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
