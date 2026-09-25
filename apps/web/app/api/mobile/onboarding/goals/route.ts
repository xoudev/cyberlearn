import { type NextRequest, NextResponse } from "next/server";
import { saveOnboardingGoalsFor } from "@/lib/onboarding/steps";
import { userFromBearer } from "../../_lib/auth";
import { readJson } from "../_body";

/**
 * Sign-up, step 3 in the app, on the way to the placement test: `{ goals,
 * level }` kept, and the sign-up left open. Submitting the test ends it.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const read = await readJson(request);
  if (!read.ok) return read.response;

  return NextResponse.json(await saveOnboardingGoalsFor(user.id, read.body));
}
