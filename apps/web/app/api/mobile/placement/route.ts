import { type NextRequest, NextResponse } from "next/server";
import { placementTestFor } from "@/lib/onboarding/placement";
import { userFromBearer } from "../_lib/auth";

/**
 * The placement test for the caller: the active questions and their options,
 * never the right one. "taken" once they have a result, "empty" when there is
 * no question to ask. The same service as the site's onboarding page.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, ...(await placementTestFor(user.id)) });
}
