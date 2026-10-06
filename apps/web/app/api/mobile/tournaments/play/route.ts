import { type NextRequest, NextResponse } from "next/server";
import {
  submitTournamentFlag,
  tournamentChallengeFor,
  tournamentViewFor,
  type TournamentChallengeView,
} from "@/lib/tournaments/tournaments";
import { userFromBearer } from "../../_lib/auth";

/**
 * One tournament from the app, through the site's service
 * (lib/tournaments/tournaments.ts).
 *
 *   GET  ?id=                                   its challenges and scoreboard, read again every few seconds
 *   GET  ?id=&slug=                             one of its challenges, to play
 *   POST { tournamentId, challengeId, flag }    give a flag
 *
 * A challenge's machine stays on the site, like the catalogue's: the app is
 * told there is one and leads there.
 */

function unauthenticated(): NextResponse {
  return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
}

function notFound(): NextResponse {
  return NextResponse.json({ ok: false, error: "Tournoi introuvable." }, { status: 404 });
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const params = request.nextUrl.searchParams;
  const slug = params.get("slug");
  if (slug !== null) {
    const page = await tournamentChallengeFor(user.id, params.get("id"), slug);
    if (page === null) return notFound();
    // Everything but the machine, which only the site runs.
    const view: TournamentChallengeView = {
      tournament: page.tournament,
      challenge: page.challenge,
      solved: page.solved,
    };
    return NextResponse.json({ ok: true, challenge: view });
  }
  const view = await tournamentViewFor(user.id, params.get("id"));
  if (view === null) return notFound();
  return NextResponse.json({ ok: true, tournament: view });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const result = await submitTournamentFlag(user.id, await readJson(request));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
