import { type NextRequest, NextResponse } from "next/server";
import { saveOnboardingAvatar } from "@/lib/onboarding/steps";
import { userFromBearer } from "../../_lib/auth";
import { readJson } from "../_body";

/** Sign-up, step 2 in the app: `{ avatarUrl }`, one of the built-in avatars. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const read = await readJson(request);
  if (!read.ok) return read.response;

  const body = read.body;
  const avatarUrl =
    typeof body === "object" && body !== null && "avatarUrl" in body ? body.avatarUrl : null;
  const result = await saveOnboardingAvatar(user.id, avatarUrl);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
