import { type NextRequest, NextResponse } from "next/server";
import { mockExamOverview, startMockExam } from "@/lib/exam/mock-exam";
import { userFromBearer } from "../_lib/auth";

/**
 * A path's mock exam from the app, through the site's service
 * (lib/exam/mock-exam.ts): the same draw, the same clock, the same score.
 *
 *   GET  ?slug=        what the exam covers, and the attempts already made
 *   POST { pathId }    start an attempt, or resume the one running
 */

function unauthenticated(): NextResponse {
  return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const overview = await mockExamOverview(user.id, request.nextUrl.searchParams.get("slug"));
  if (overview === null) {
    return NextResponse.json({ ok: false, error: "Parcours introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, overview });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();
  const body = await readJson(request);
  const pathId = typeof body === "object" && body !== null && "pathId" in body ? body.pathId : null;
  const started = await startMockExam(user.id, pathId);
  return NextResponse.json(started, { status: started.ok ? 200 : 400 });
}
