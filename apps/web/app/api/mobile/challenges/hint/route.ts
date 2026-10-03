import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revealHintFor } from "@/lib/challenges/play";
import { userFromBearer } from "../../_lib/auth";

const schema = z.object({ hintId: z.guid() });

/** A hint revealed from the app: the same XP spent, the same rate limit, as on the site. */
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
  const result = await revealHintFor(user.id, parsed.data.hintId);
  return NextResponse.json({ ok: true, ...result });
}
