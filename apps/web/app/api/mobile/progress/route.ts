import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeLessonForUser } from "@/lib/lessons/complete";
import { userFromBearer } from "../_lib/auth";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

const schema = z.object({
  lessonId: z.guid(),
});

/**
 * Mark a lesson COMPLETED for the authenticated mobile user, through the same
 * guarded flow as the web action (XP ledger anti-replay, streak, badges,
 * quests, certificates). Returns the CompleteLessonResult so the app can play
 * its reward animations (+XP, level-up, new badges).
 *
 * A completion the flow refuses (a lesson still locked in its path, one the
 * reader may not open) is a 409 carrying the reason: the app lists every
 * lesson, so it can reach one the site would not have opened, and it shows
 * the reason where it would otherwise say the progress is saved.
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  try {
    const result = await completeLessonForUser(user.id, parsed.data.lessonId);
    if (result.refusal !== null) {
      return NextResponse.json({ ok: false, error: result.refusal }, { status: 409 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "mobile/progress", err: errorMessage(err) }, "completion error");
    return NextResponse.json({ ok: false, error: "Enregistrement impossible." }, { status: 500 });
  }
}
