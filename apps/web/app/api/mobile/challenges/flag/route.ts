import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitFlagFor } from "@/lib/challenges/play";
import { userFromBearer } from "../../_lib/auth";

const schema = z.object({ challengeId: z.guid(), flag: z.string().max(500) });

/**
 * A flag from the app, checked as the site checks it (lib/challenges/play.ts):
 * the learner's own flag on a machine, the attempt counted, the XP credited
 * once.
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
  const result = await submitFlagFor(user.id, parsed.data.challengeId, parsed.data.flag);
  return NextResponse.json({ ok: true, ...result });
}
