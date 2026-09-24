import { type NextRequest, NextResponse } from "next/server";
import { reportQuiz } from "@/lib/lessons/quiz-report";
import { userFromBearer } from "../_lib/auth";

/**
 * Records the mobile user's report on one quiz, through the same service as
 * the web action. The app reads its own open reports directly (RLS: own rows).
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

  const result = await reportQuiz(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
