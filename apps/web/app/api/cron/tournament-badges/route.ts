import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { failureCounts, trackCronRun } from "@/lib/cron-run";
import { awardTournamentPlaces } from "@/lib/tournaments/badges";

export const maxDuration = 60;

// Vercel Cron (see vercel.json): gives the players of the tournaments ended
// in the last seven days the badges of their team's place. Idempotent - a
// badge held is skipped, and the board of a finished tournament does the same
// for its reader when the run is missed.
export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed, in constant time: see lib/cron-auth.ts.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A player whose badges could not be given leaves the others theirs, and the run failed all the same.
  const summary = await trackCronRun("tournament-badges", () => awardTournamentPlaces(new Date()), {
    failure: (r) => failureCounts([[r.failed, "joueur non traité", "joueurs non traités"]]),
  });
  return NextResponse.json({ ok: true, ...summary });
}
