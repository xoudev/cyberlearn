import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorMessage } from "@cyberlearn/lib/logger";
import { lessonLocks, unlocksEveryLesson, waivedLessonIds } from "@/lib/lessons/access";
import { requestLogger } from "@/lib/request-logger";
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
 * them, and the mission after each, as the site does
 * (@cyberlearn/lib/paths/unlock).
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

// The app's catalogue lists sixty lessons at most; a lesson screen asks for one.
const locksSchema = z.object({
  lessonIds: z.array(z.guid()).min(1).max(100),
});

/**
 * Which of these lessons are still locked for the caller, and in which path,
 * `{ ok, locked: { [lessonId]: { slug, title } } }`; a lesson left out may be
 * read. The same rule as the site's catalogue and lesson page, waivers of the
 * placement test included (a waived lesson opens the one after it, as a
 * completed one does), decided here so the app's catalogue can lead a locked
 * lesson to its path and its lesson screen can send the reader there, as the
 * site does.
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
  const parsed = locksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  try {
    const locks = await lessonLocks(user.id, [...new Set(parsed.data.lessonIds)]);
    return NextResponse.json({ ok: true, locked: Object.fromEntries(locks) });
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "mobile/lesson-access", err: errorMessage(err) }, "lock read error");
    return NextResponse.json({ ok: false, error: "Lecture impossible." }, { status: 500 });
  }
}
