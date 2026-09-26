import { type NextRequest, NextResponse } from "next/server";
import { leaderboardRepository } from "@cyberlearn/db";
import { userFromBearer } from "../_lib/auth";

/**
 * The reader's rank, as the site's dashboard shows it, for the app's home
 * screen. The app used to count the users above it itself; RLS and the board's
 * rules (students only, first XP, not hidden) live on the server, so it read
 * "#1" for an account that is not on the board at all. `null` is "not ranked".
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const rank = await leaderboardRepository.findUserRank(user.id);
  return NextResponse.json({ ok: true, rank: rank > 0 ? rank : null });
}
