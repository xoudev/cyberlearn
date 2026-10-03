import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeFor } from "@/lib/challenges/play";
import { userFromBearer } from "../../_lib/auth";

const schema = z.object({ challengeId: z.guid() });

/** A puzzle or a lab marked done from the app, as on the site (on trust). */
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
  const result = await completeFor(user.id, parsed.data.challengeId);
  return NextResponse.json({ ok: true, ...result });
}
