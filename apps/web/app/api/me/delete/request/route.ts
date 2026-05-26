import { prisma } from "@cyberlearn/db";
import { type NextRequest, NextResponse } from "next/server";
import { checkAccountDeletionRequest } from "@/lib/rate-limit";
import { requestDeletion } from "@/lib/rgpd/request-deletion";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ERROR_STATUS: Record<string, number> = {
  email_failed: 502,
  internal: 500,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth — getUser() validates the JWT server-side (no network shortcut)
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Rate limit — 3 requests per user per 24 hours
  const rl = await checkAccountDeletionRequest(user.id);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  // 3. Fetch DB user for email + display name
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, displayName: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 4. Extract metadata
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";

  // 5. Delegate to shared lib — token generation, DB store, email, audit log
  const result = await requestDeletion(
    { id: user.id, email: dbUser.email, displayName: dbUser.displayName },
    { ip, userAgent },
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: ERROR_STATUS[result.error] ?? 500 },
    );
  }

  return NextResponse.json({ message: "Email de confirmation envoyé." }, { status: 202 });
}
