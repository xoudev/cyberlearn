import { type NextRequest, NextResponse } from "next/server";
import { acknowledgeBan } from "@/lib/moderation/ban-appeal";
import { identityFromBearer } from "../../_lib/auth";

/**
 * Records that the banned mobile user has seen the notice, as closing it does
 * on the site. Reached through identityFromBearer, not userFromBearer: this is
 * one of the two things a banned account may still do.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await identityFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const result = await acknowledgeBan(user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
