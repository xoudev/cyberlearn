import { type NextRequest, NextResponse } from "next/server";
import { listFriendsFor } from "@/lib/friends/friends-service";
import { toMobileFriendLists } from "@/lib/friends/mobile-view";
import { userFromBearer } from "../_lib/auth";

/**
 * The reader's three lists: requests waiting on them, their friends, the
 * requests they sent. Served by the API rather than read under RLS because
 * each row carries the other person's avatar, and an uploaded one has to be
 * signed with the service_role key.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const lists = await listFriendsFor(user.id);
  return NextResponse.json({ ok: true, ...toMobileFriendLists(lists) });
}
