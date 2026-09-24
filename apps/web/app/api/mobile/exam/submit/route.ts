import { type NextRequest, NextResponse } from "next/server";
import { submitExam } from "@/lib/exam/exam-service";
import { userFromBearer } from "../../_lib/auth";

/**
 * Submits the mobile user's exam attempt through the site's service: scored
 * on the server, the certificate issued on a pass, explanations returned for
 * the review.
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
  // SAFETY: an unknown JSON body; both fields are validated by the service.
  const { attemptId, answers } = (body ?? {}) as { attemptId?: unknown; answers?: unknown };

  const result = await submitExam(user.id, attemptId, answers);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
