import { type NextRequest, NextResponse } from "next/server";
import { unshareNoteFor } from "@/lib/notes/note-share";
import { userFromBearer } from "../../_lib/auth";

/** POST `{ noteId, recipientId }`: takes the note back from one person. */
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
  const noteId = typeof body === "object" && body !== null && "noteId" in body ? body.noteId : null;
  const recipientId =
    typeof body === "object" && body !== null && "recipientId" in body ? body.recipientId : null;

  const result = await unshareNoteFor(user.id, noteId, recipientId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
