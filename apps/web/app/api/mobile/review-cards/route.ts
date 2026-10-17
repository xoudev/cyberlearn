import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  answerDailyRecall,
  answerModuleReview,
  openDailyRecall,
  openModuleReview,
} from "@/lib/revisions/daily-recall";
import { userFromBearer } from "../_lib/auth";

/**
 * The review cards for the app, through the site's service
 * (lib/revisions/daily-recall.ts): the same draw, the same check on the
 * server, the same XP once a day, the same module review.
 *
 * GET                      the day's recall, drawn on its first opening of the day
 * GET ?path=SLUG&module=N  "Réviser ce module": six questions of its finished lessons
 * POST { index, selected } an answer to the day's recall
 * POST { path, module, day, index, lessonId, quizId, selected }
 *                          an answer to a module's review (nothing is recorded)
 *
 * The lesson-level queue keeps its own route (/api/mobile/review) for the
 * installed apps until it is retired.
 */

const moduleQuery = z.object({
  path: z.string().trim().min(1).max(120),
  module: z.coerce.number().int().min(1).max(99),
});

const selected = z.number().int().min(0).max(25);
const index = z.number().int().min(0).max(50);
const dailyAnswer = z.object({ index, selected });
const moduleAnswer = z.object({
  path: z.string().trim().min(1).max(120),
  module: z.number().int().min(1).max(99),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  index,
  lessonId: z.guid(),
  quizId: z.string().min(1).max(100),
  selected,
});

function unauthenticated(): NextResponse {
  return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
}

function invalid(): NextResponse {
  return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();

  const params = request.nextUrl.searchParams;
  const path = params.get("path");
  const moduleNumber = params.get("module");
  if (path === null && moduleNumber === null) {
    return NextResponse.json({ ok: true, recall: await openDailyRecall(user.id) });
  }
  const parsed = moduleQuery.safeParse({ path, module: moduleNumber });
  if (!parsed.success) return invalid();
  return NextResponse.json({ ok: true, recall: await openModuleReview(user.id, parsed.data) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) return unauthenticated();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }

  const isModule = typeof body === "object" && body !== null && "path" in body;
  const parsed = isModule ? moduleAnswer.safeParse(body) : dailyAnswer.safeParse(body);
  if (!parsed.success) return invalid();

  const result = isModule
    ? await answerModuleReview(user.id, parsed.data)
    : await answerDailyRecall(user.id, parsed.data);
  if (!result.ok) {
    // Answered already, handed in, no longer today's or no longer in the
    // lesson: nothing was recorded.
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true, verdict: result.verdict, result: result.result });
}
