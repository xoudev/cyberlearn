import { type NextRequest, NextResponse } from "next/server";
import type { FriendActionResult } from "@/lib/friends/friends-service";
import { userFromBearer } from "../../_lib/auth";

/**
 * The three writes on a friendship all take the same body, `{ userId }`, the
 * other person's id, and answer the same way. The id is handed to the service
 * as it came: validating it is the service's job, the same for the site.
 */
export function friendWriteRoute(
  act: (userId: string, otherId: unknown) => Promise<FriendActionResult>,
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
    const otherId =
      typeof body === "object" && body !== null && "userId" in body ? body.userId : null;

    const result = await act(user.id, otherId);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  };
}
