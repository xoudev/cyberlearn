import { type NextRequest, NextResponse } from "next/server";
import { recapFor } from "@/lib/wrapped/recap";
import { userFromBearer } from "../_lib/auth";

/**
 * The caller's recap of the year, when Wrapped is open (1 December to
 * 7 January); otherwise when it next opens. The window is the server's
 * decision, from its own clock, as on the site.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, ...(await recapFor(user.id)) });
}
