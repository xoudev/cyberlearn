import { type NextRequest, NextResponse } from "next/server";
import { tournamentListFor } from "@/lib/tournaments/tournaments";
import { userFromBearer } from "../_lib/auth";

/**
 * CTF tournaments from the app, through the site's service
 * (lib/tournaments/tournaments.ts).
 *
 *   GET    the tournaments the reader's classes take part in, whether the
 *          reader is in a class (what an empty list explains, as on the
 *          site's Tournois tab), and the server's clock, which the app
 *          measures the running windows on
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  const { tournaments, inClass } = await tournamentListFor(user.id);
  return NextResponse.json({ ok: true, tournaments, inClass, serverNow: new Date().toISOString() });
}
