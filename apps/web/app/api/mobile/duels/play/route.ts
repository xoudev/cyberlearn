import { type NextRequest, NextResponse } from "next/server";
import { answerDuel, duelViewFor, respondToDuel } from "@/lib/social/duels";
import { userFromBearer } from "../../_lib/auth";

/**
 * One duel from the app, through the site's service (lib/social/duels.ts).
 *
 *   GET  ?id=                                 the duel as the reader sees it, read again every few seconds
 *   POST { action: "respond", id, accept }    accept or decline an invitation
 *   POST { action: "answer", duelId, index, selected }   answer a question
 */

function unauthenticated(): NextResponse {
  return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
}

async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null ? { ...body } : {};
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const view = await duelViewFor(user.id, request.nextUrl.searchParams.get("id"));
  if (view === null) {
    return NextResponse.json({ ok: false, error: "Duel introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, duel: view });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const body = await readJson(request);
  if (body.action === "respond") {
    const result = await respondToDuel(user.id, body.id, body.accept);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (body.action === "answer") {
    const result = await answerDuel(user.id, {
      duelId: body.duelId,
      index: body.index,
      selected: body.selected,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
}
