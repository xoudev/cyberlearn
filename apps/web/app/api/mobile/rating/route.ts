import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ratingRepository } from "@cyberlearn/db";
import { ratePathForUser } from "@/lib/paths/rate-path";
import { userFromBearer } from "../_lib/auth";

const schema = z.object({
  pathId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

/**
 * Rates a path for the mobile user, through the same service as the web
 * action: the path must be visible to them and one of its lessons completed.
 * Ratings are not written through the Data API (see the ratings_server_only
 * migration): the average on the path is recomputed here, with the rating.
 */
/** The mobile user's own rating of a path, to show it again: GET ?pathId=. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const pathId = z.string().uuid().safeParse(request.nextUrl.searchParams.get("pathId"));
  if (!pathId.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const mine = await ratingRepository.findUserPathRating(user.id, pathId.data);
  return NextResponse.json({
    ok: true,
    score: mine?.score ?? null,
    feedback: mine?.feedback ?? null,
  });
}

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const { pathId, score, feedback } = parsed.data;
  const result = await ratePathForUser(user.id, pathId, score, feedback);
  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}
