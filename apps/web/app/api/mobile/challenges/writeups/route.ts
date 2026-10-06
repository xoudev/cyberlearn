import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteWriteup, publishWriteup, writeupBoardFor } from "@/lib/challenges/writeups";
import { userFromBearer } from "../../_lib/auth";

/**
 * A challenge's write-ups from the app, read and written through the site's
 * service (lib/challenges/writeups.ts): the count only until the challenge
 * is solved, then the reader's own solution and the others'.
 *
 *   GET    ?challengeId=   the board
 *   POST   { challengeId, content }   publish or replace the reader's solution
 *   DELETE { challengeId }   remove it
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
  const board = await writeupBoardFor(user.id, request.nextUrl.searchParams.get("challengeId"));
  if (board === null) {
    return NextResponse.json({ ok: false, error: "Défi introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, board });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const result = await publishWriteup(user.id, await readJson(request));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

const deleteSchema = z.object({ challengeId: z.guid() });

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const parsed = deleteSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Défi introuvable." }, { status: 400 });
  }
  const result = await deleteWriteup(user.id, parsed.data.challengeId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
