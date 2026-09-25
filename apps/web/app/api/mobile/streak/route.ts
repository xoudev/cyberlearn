import { type NextRequest, NextResponse } from "next/server";
import { streakRepository } from "@cyberlearn/db";
import { userFromBearer } from "../_lib/auth";

/**
 * The caller's streak panel, as the site's dashboard and profile read it
 * (streakRepository.getOverview): the series and the record, the days active
 * this year, a year of activity by day, and the streak-freezes in reserve.
 * A route rather than a read under RLS because the freeze count is one of
 * the users columns the Data API no longer serves.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const overview = await streakRepository.getOverview(user.id);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "Compte introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...overview });
}
