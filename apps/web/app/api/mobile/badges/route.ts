import { type NextRequest, NextResponse } from "next/server";
import { buildBadgeCollection } from "@/lib/badges/collection";
import { userFromBearer } from "../_lib/auth";

/**
 * The site's badge collection (/badges), for the app's Collection tab: every
 * active badge, earned or locked, grouped by rarity with the progress of the
 * locked ones. Built by the same service, so a badge the caller already
 * qualifies for is caught up here exactly as the site's page does it.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const collection = await buildBadgeCollection(user.id);
  return NextResponse.json({ ok: true, ...collection });
}
