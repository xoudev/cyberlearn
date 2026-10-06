import { type NextRequest, NextResponse } from "next/server";
import { createDuel, duelSetupFor, listDuelsFor } from "@/lib/social/duels";
import { userFromBearer } from "../_lib/auth";

/**
 * Quiz duels from the app, through the site's service (lib/social/duels.ts).
 *
 *   GET                             the reader's duels, the friends and the paths a duel can be sent on
 *   POST { opponentId, pathId }     challenge a friend
 */

function unauthenticated(): NextResponse {
  return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
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
  const [duels, setup] = await Promise.all([listDuelsFor(user.id), duelSetupFor(user.id)]);
  return NextResponse.json({ ok: true, duels, ...setup });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const result = await createDuel(user.id, await readJson(request));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
