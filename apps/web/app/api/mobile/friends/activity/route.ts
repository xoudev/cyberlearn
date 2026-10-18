import { type NextRequest, NextResponse } from "next/server";
import { activityLimitSchema, friendsActivityFor } from "@/lib/friends/friends-activity";
import { userFromBearer } from "../../_lib/auth";

/**
 * "Tes amis" for the app's home: what the reader's friends did lately, each
 * moment with the friend's picture signed and whether a duel with them is
 * still open, through the same service as the site's dashboard
 * (lib/friends/friends-activity.ts).
 *
 *   GET ?limit=<1..20>   six moments without it
 *
 * `hasFriends` false: the reader has no friend, and the app draws nothing.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const limit = activityLimitSchema.safeParse(
    request.nextUrl.searchParams.get("limit") ?? undefined,
  );
  if (!limit.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const activity = await friendsActivityFor(user.id, limit.data);
  return NextResponse.json({ ok: true, ...activity });
}
