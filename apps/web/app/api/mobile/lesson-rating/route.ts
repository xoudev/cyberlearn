import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { lessonsVisibleTo, prisma, ratingRepository } from "@cyberlearn/db";
import { rateLessonForUser } from "@/lib/lessons/rate-lesson";
import { userFromBearer } from "../_lib/auth";

/**
 * A lesson's rating for the mobile user: GET ?lessonId= for their own rating
 * and the lesson's average, POST to rate it through the site's service (the
 * lesson completed first). Ratings are not written through the Data API.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const lessonId = z.string().uuid().safeParse(request.nextUrl.searchParams.get("lessonId"));
  if (!lessonId.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  // A class's own lesson is only its class's, figures included.
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId.data, ...lessonsVisibleTo(user.id) },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ ok: false, error: "Leçon introuvable." }, { status: 404 });
  }

  const [mine, stats] = await Promise.all([
    ratingRepository.findUserLessonRating(user.id, lesson.id),
    ratingRepository.findLessonStats(lesson.id),
  ]);
  return NextResponse.json({
    ok: true,
    score: mine?.score ?? null,
    feedback: mine?.feedback ?? null,
    avgRating: stats?.avgRating ?? null,
    ratingsCount: stats?.ratingsCount ?? 0,
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

  const result = await rateLessonForUser(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}
