import { type NextRequest, NextResponse } from "next/server";
import { postLessonQuestion } from "@/lib/lessons/qa";
import { userFromBearer } from "../../_lib/auth";

/** Asks a question on a lesson through the site's service: same rate limit, same screen, held for review when flagged. */
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

  const result = await postLessonQuestion(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
