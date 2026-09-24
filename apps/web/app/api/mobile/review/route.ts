import { type NextRequest, NextResponse } from "next/server";
import { gradeReview } from "@/lib/revisions/grade-review";
import { userFromBearer } from "../_lib/auth";

/**
 * Grades one of the mobile user's due reviews, through the site's service:
 * same SM-2 step, same XP, same protection against grading twice. The app
 * reads its queue directly (RLS: own schedules).
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

  const result = await gradeReview(user.id, body);
  if (!result.ok) {
    // Not due, not theirs, or malformed: nothing was graded.
    return NextResponse.json(
      { ok: false, error: "Cette révision n'est plus à faire." },
      { status: 409 },
    );
  }
  return NextResponse.json({
    ok: true,
    nextReviewAt: result.nextReviewAt.toISOString(),
    reviewXp: result.reviewXp,
  });
}
