import { type NextRequest, NextResponse } from "next/server";
import { challengeItemsFor } from "@/lib/challenges/catalogue";
import { userFromBearer } from "../_lib/auth";

/**
 * The active challenges with where the caller stands, as the site's /challenges
 * lists them (lib/challenges/catalogue.ts). A route rather than a read under
 * RLS: the challenges table has no policy, since it holds the flags.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, items: await challengeItemsFor(user.id) });
}
