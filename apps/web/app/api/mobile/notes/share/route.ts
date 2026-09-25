import { type NextRequest, NextResponse } from "next/server";
import { shareAudienceFor, shareNoteFor } from "@/lib/notes/note-share";
import { userFromBearer } from "../../_lib/auth";

/**
 * GET `?noteId=`: who the note can go to (the author's classes and friends,
 * as the repository lists them) and who already holds it.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const state = await shareAudienceFor(user.id, request.nextUrl.searchParams.get("noteId"));
  return NextResponse.json({
    ok: true,
    noAudience: state.noAudience,
    // Named field by field so the stored avatar value stays behind: the
    // picker does not draw it.
    entries: state.entries.map((e) => ({
      id: e.id,
      name: e.name,
      kind: e.kind,
      groupId: e.groupId,
      groupLabel: e.groupLabel,
      holds: e.holds,
    })),
  });
}

/**
 * POST `{ noteId, recipientIds }`: shares through the site's service, so the
 * note is screened, a refusal is announced to the author and their teachers
 * are told, exactly as on the site.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const result = await shareNoteFor(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
