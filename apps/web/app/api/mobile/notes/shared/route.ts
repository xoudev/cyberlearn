import { type NextRequest, NextResponse } from "next/server";
import { sharedWithMeFor } from "@/lib/notes/note-share";
import { userFromBearer } from "../../_lib/auth";

/**
 * The notes other people handed to the reader: the site's "Reçues". Served by
 * the API because a note shared with somebody is read through the repository
 * (noteShareRepository.listSharedWithMe), not through the notes table's own
 * RLS, which lets each person read only what they wrote.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, notes: await sharedWithMeFor(user.id) });
}
