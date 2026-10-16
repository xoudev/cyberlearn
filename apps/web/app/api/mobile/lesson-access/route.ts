import { type NextRequest, NextResponse } from "next/server";
import { unlocksEveryLesson, waivedLessonIds } from "@/lib/lessons/access";
import { userFromBearer } from "../_lib/auth";

/**
 * How the path lock applies to the caller, `{ ok, unlockAll, waivedLessonIds }`.
 *
 * `unlockAll` is true for an administrator, as on the site. The app cannot
 * read the role itself (the column is not granted to its client), and it
 * should not have to: it gets the consequence, decided on the server from
 * public.users.
 *
 * `waivedLessonIds` are the lessons the placement test waived: the app opens
 * them, and the mission after each, as the site does (lib/lessons/unlock.ts).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const [unlockAll, waived] = await Promise.all([
    unlocksEveryLesson(user.id),
    waivedLessonIds(user.id),
  ]);
  return NextResponse.json({ ok: true, unlockAll, waivedLessonIds: waived });
}
