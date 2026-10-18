import { type NextRequest, NextResponse } from "next/server";
import { reportContentFor } from "@/lib/moderation/content-report";
import { userFromBearer } from "../_lib/auth";

/**
 * POST `{ surface, contentId, reason, comment? }`: the reader reports a forum
 * message, a question or an answer under a lesson, or a challenge solution,
 * through the same service as the site's « Signaler ».
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

  const result = await reportContentFor(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
