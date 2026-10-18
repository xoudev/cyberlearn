import { type NextRequest, NextResponse } from "next/server";
import { userFromBearer } from "../_lib/auth";

/**
 * Where the old lesson-level queue (SM-2) was graded, kept for the app builds
 * installed before the review cards: they still send a grade here, as
 * `{ scheduleId, quality }`, and read back `{ ok: true, ... }` or
 * `{ ok: false, error }`, the error shown under the review.
 *
 * The queue is retired, and those builds read it empty now (the
 * review_schedules view, migration 20261018120000_retire_review_schedules),
 * so a grade can only come from a screen opened before. Nothing is graded and
 * nothing is credited: every grade is refused, in the shape those builds read
 * without trouble, with a word on where the revisions went. A 404 would
 * reach them as a reply they cannot read.
 */

const RETIRED_REVIEW_ERROR =
  "Cette révision n'est plus à faire : mets l'app à jour pour retrouver ton rappel du jour.";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  return NextResponse.json({ ok: false, error: RETIRED_REVIEW_ERROR }, { status: 409 });
}
