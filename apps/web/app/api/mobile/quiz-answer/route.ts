import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordQuizAnswer } from "@/lib/lessons/quiz-answer";
import { userFromBearer } from "../_lib/auth";

const schema = z.object({
  lessonId: z.string().uuid(),
  quizId: z.string().min(1).max(100),
  selected: z.number().int().min(0).max(25),
});

/**
 * Records the mobile user's answer to one quiz, through the same service as
 * the web action: the first answer is kept, and whether it is right is
 * decided here from the lesson. Answers the answer on record, which is an
 * earlier one if the quiz was already answered on another device.
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

  const { lessonId, quizId, selected } = parsed.data;
  const result = await recordQuizAnswer(user.id, lessonId, quizId, selected);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
