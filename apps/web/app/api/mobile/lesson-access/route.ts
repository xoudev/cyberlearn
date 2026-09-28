import { type NextRequest, NextResponse } from "next/server";
import { unlocksEveryLesson } from "@/lib/lessons/access";
import { userFromBearer } from "../_lib/auth";

/**
 * Whether the caller skips the path lock, `{ ok, unlockAll }`: true for an
 * administrator, as on the site. The app cannot read the role itself (the
 * column is not granted to its client), and it should not have to: it gets the
 * consequence, decided on the server from public.users.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, unlockAll: await unlocksEveryLesson(user.id) });
}
