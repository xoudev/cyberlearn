import { type NextRequest, NextResponse } from "next/server";
import { submitMockExam } from "@/lib/exam/mock-exam";
import { userFromBearer } from "../../_lib/auth";

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

/**
 * POST { attemptId, answers }: a mock exam handed in from the app, scored on
 * the server by the site's service (lib/exam/mock-exam.ts), which reads the
 * input with Zod.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const body = await readJson(request);
  const record = typeof body === "object" && body !== null ? body : {};
  const handed = await submitMockExam(
    user.id,
    "attemptId" in record ? record.attemptId : null,
    "answers" in record ? record.answers : null,
  );
  return NextResponse.json(handed, { status: handed.ok ? 200 : 400 });
}
