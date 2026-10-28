import { type NextRequest, NextResponse } from "next/server";
import { questRepository } from "@cyberlearn/db";
import { isoWeekKey, previousIsoWeekKey } from "@cyberlearn/lib";
import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";
import { userFromBearer } from "../_lib/auth";

/**
 * The week's quests for the app, with the caller's progress: the four the
 * week drew from the pool and the completion bonus (questRepository.findWeek).
 * The app used to read every active quest under RLS; with a pool, only the
 * site knows which ones the week asks for, and it draws them on the week's
 * first read, whoever asks first.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  try {
    const now = new Date();
    const quests = await questRepository.findWeek(
      user.id,
      isoWeekKey(now),
      previousIsoWeekKey(now),
    );
    return NextResponse.json({
      ok: true,
      quests: quests.map((quest) => ({
        id: quest.id,
        title: quest.title,
        type: quest.type,
        target: quest.target,
        xpReward: quest.xpReward,
        freezeReward: quest.freezeReward,
        progress: quest.progress,
        completed: quest.completed,
        claimed: quest.claimed,
      })),
    });
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "mobile/quests", err: errorMessage(err) }, "error");
    return NextResponse.json(
      { ok: false, error: "Les quêtes n'ont pas pu être chargées." },
      { status: 500 },
    );
  }
}
