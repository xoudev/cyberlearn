import { type NextRequest, NextResponse } from "next/server";
import { editForumPost } from "@/lib/forum/forum-service";
import { userFromBearer } from "../../../_lib/auth";

/**
 * Rewrites one of the reader's own posts through the site's service: screened
 * again, marked as edited, taken down when the new text is flagged.
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

  const result = await editForumPost(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
