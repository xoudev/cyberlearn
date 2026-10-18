import { type NextRequest, NextResponse } from "next/server";
import type { FriendActionResult } from "@/lib/friends/friends-service";
import { userFromBearer } from "../../_lib/auth";

type FriendAct = (userId: string, other: unknown) => Promise<FriendActionResult>;

/**
 * The writes on a friendship all take the same body, `{ userId }`, the other
 * person's id, and answer the same way. The id is handed to the service as it
 * came: validating it is the service's job, the same for the site.
 *
 * A write that can also name the other person by handle (`byHandle`: a
 * request sent from a public line of the leaderboard, whose rows carry no id)
 * takes `{ username }` in place of `{ userId }`; a body with an id is read as
 * it always was.
 */
export function friendWriteRoute(
  act: FriendAct,
  byHandle?: FriendAct,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request) => {
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
    const fields = typeof body === "object" && body !== null ? body : {};
    const otherId = "userId" in fields ? fields.userId : null;

    const result =
      byHandle !== undefined && otherId === null && "username" in fields
        ? await byHandle(user.id, fields.username)
        : await act(user.id, otherId);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  };
}
