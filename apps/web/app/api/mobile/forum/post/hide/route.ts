import { type NextRequest, NextResponse } from "next/server";
import { hideForumPost } from "@/lib/forum/forum-service";
import { userFromBearer } from "../../../_lib/auth";

/**
 * Takes a post down through the site's service: its author may, and so may an
 * administrator. Taking down the opening post takes the thread with it.
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
  // SAFETY: an unknown JSON body; postId is validated by the service.
  const { postId } = (body ?? {}) as { postId?: unknown };

  const result = await hideForumPost(user.id, postId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
