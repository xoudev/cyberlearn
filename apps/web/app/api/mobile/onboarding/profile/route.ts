import { type NextRequest, NextResponse } from "next/server";
import { saveOnboardingProfile } from "@/lib/onboarding/steps";
import { userFromBearer } from "../../_lib/auth";
import { readJson } from "../_body";

/**
 * Sign-up, step 1 in the app: `{ username, displayName, bio? }`, through the
 * site's service (same rules, same "déjà pris", field by field).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const read = await readJson(request);
  if (!read.ok) return read.response;

  const result = await saveOnboardingProfile(user.id, read.body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
