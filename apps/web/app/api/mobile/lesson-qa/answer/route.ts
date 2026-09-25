import { type NextRequest, NextResponse } from "next/server";
import { postLessonAnswer } from "@/lib/lessons/qa";
import { userFromBearer } from "../../_lib/auth";

/** Answers a question through the site's service: same rate limit, same screen, the weekly quest credited unless held. */
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

  const result = await postLessonAnswer(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
