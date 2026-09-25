import { type NextRequest, NextResponse } from "next/server";
import { acceptLessonAnswer } from "@/lib/lessons/qa";
import { userFromBearer } from "../../_lib/auth";

/** Accepts an answer on the reader's own question, which resolves it. */
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
  // SAFETY: an unknown JSON body; answerId is validated by the service.
  const { answerId } = (body ?? {}) as { answerId?: unknown };

  const result = await acceptLessonAnswer(user.id, answerId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
