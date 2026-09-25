import { type NextRequest, NextResponse } from "next/server";
import { claimQuestFor } from "@/lib/quests/claim";
import { userFromBearer } from "../../_lib/auth";

/**
 * Claims a completed weekly quest for the caller, `{ questId }`: the site's
 * service, so the XP, the streak-freeze and the once-only guard are the same.
 * The week's quests themselves the app reads under RLS.
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
  const questId =
    typeof body === "object" && body !== null && "questId" in body ? body.questId : null;

  const result = await claimQuestFor(user.id, questId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
