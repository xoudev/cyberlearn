import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeLessonForUser, type CompletionRefusal } from "@/lib/lessons/complete";
import { userFromBearer } from "../_lib/auth";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

const schema = z.object({
  lessonId: z.guid(),
});

/** The status of each refusal: a lesson locked in its path is forbidden, the rest not found. */
const REFUSAL_STATUS: Record<CompletionRefusal, number> = {
  locked: 403,
  unreadable: 404,
  "no-account": 404,
};

/**
 * Mark a lesson COMPLETED for the authenticated mobile user, through the same
 * guarded flow as the web action (XP ledger anti-replay, streak, badges,
 * quests, certificates). Returns the CompleteLessonResult so the app can play
 * its reward animations (+XP, level-up, new badges).
 *
 * A refused completion is `ok: false`, with what to tell the learner. Every
 * version of the app reads that as "not synchronised"; an `ok: true` around an
 * empty result made it announce a completion that was never recorded.
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
    const outcome = await completeLessonForUser(user.id, parsed.data.lessonId);
    if (!outcome.ok) {
      return NextResponse.json(
        { ok: false, error: outcome.error },
        { status: REFUSAL_STATUS[outcome.refused] },
      );
    }
    return NextResponse.json({ ok: true, result: outcome.result });
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "mobile/progress", err: errorMessage(err) }, "completion error");
    return NextResponse.json({ ok: false, error: "Enregistrement impossible." }, { status: 500 });
  }
}
