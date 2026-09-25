import { type NextRequest, NextResponse } from "next/server";
import { markOnboardingComplete } from "@/lib/onboarding/finalize";
import { submitPlacementFor } from "@/lib/onboarding/placement";
import { userFromBearer } from "../../_lib/auth";

/**
 * Submits the caller's placement test, `{ answers: [{ questionId,
 * selectedOptionId }] }`: scored on the server against the stored answers, the
 * waivers granted, and the sign-up marked complete, as the site's action does.
 * The app refreshes its session afterwards so the token carries the flag.
 */
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

  const result = await submitPlacementFor(user.id, body);
  if (!result.ok) {
    return result.reason === "taken"
      ? NextResponse.json(
          { ok: false, taken: true, error: "Tu as déjà passé le test de positionnement." },
          { status: 409 },
        )
      : NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  await markOnboardingComplete(user.id);
  return NextResponse.json({
    ok: true,
    scores: result.scores,
    recommendedPathSlug: result.recommendedPathSlug,
  });
}
