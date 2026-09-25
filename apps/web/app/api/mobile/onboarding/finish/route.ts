import { type NextRequest, NextResponse } from "next/server";
import { finishOnboardingFor } from "@/lib/onboarding/steps";
import { userFromBearer } from "../../_lib/auth";
import { readJson } from "../_body";

/**
 * Sign-up, step 3 in the app: `{ goals?, level? }`. Keeps the answers when
 * there are both, then marks the sign-up complete. The app refreshes its
 * session afterwards so the token carries the new flag.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const read = await readJson(request);
  if (!read.ok) return read.response;

  return NextResponse.json(await finishOnboardingFor(user.id, read.body));
}
