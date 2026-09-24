import { type NextRequest, NextResponse } from "next/server";
import { EXAM_TIME_LIMIT_MINUTES, remainingSeconds } from "@cyberlearn/lib";
import { startExam } from "@/lib/exam/exam-service";
import { userFromBearer } from "../../_lib/auth";

/**
 * Starts, or resumes, the mobile user's attempt at a path's final exam,
 * through the site's service: same draw, same limits. The questions come
 * without their answer key.
 *
 * `secondsLeft` is counted here, on the server's clock: the app anchors its
 * countdown to its own clock at reception, so a phone set to the wrong time
 * neither gains nor loses minutes.
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
  // SAFETY: an unknown JSON body; pathId is validated by the service.
  const { pathId } = (body ?? {}) as { pathId?: unknown };

  const result = await startExam(user.id, pathId);
  if (!result.ok || !result.startedAt) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({
    ...result,
    startedAt: result.startedAt.toISOString(),
    secondsLeft: remainingSeconds(result.startedAt, new Date(), EXAM_TIME_LIMIT_MINUTES),
  });
}
