import { type NextRequest, NextResponse } from "next/server";
import { replyInForum } from "@/lib/forum/forum-service";
import { userFromBearer } from "../../_lib/auth";

/**
 * Replies in a thread through the site's service: same rate limit, same
 * screen, the participants told, a closed thread refused.
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

  const result = await replyInForum(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
