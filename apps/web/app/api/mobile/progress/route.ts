import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeLessonForUser } from "@/lib/lessons/complete";
import { userFromBearer } from "../_lib/auth";

const schema = z.object({
  lessonId: z.string().uuid(),
});

/**
 * Mark a lesson COMPLETED for the authenticated mobile user, through the same
 * guarded flow as the web action (XP ledger anti-replay, streak, badges,
 * quests, certificates). Returns the CompleteLessonResult so the app can play
 * its reward animations (+XP, level-up, new badges).
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
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error(
      "[mobile/progress] completion error:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ ok: false, error: "Enregistrement impossible." }, { status: 500 });
  }
}
