import crypto from "node:crypto";
import { prisma } from "@cyberlearn/db";
import { sendDeletionConfirmEmail } from "@cyberlearn/email";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pseudonymize } from "@/lib/pseudonymize";
import { checkAccountDeletionRequest } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

  // 3. Fetch DB user for email address and display name
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, displayName: true, username: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 4. Generate token — 32 bytes random → base64url plain, SHA-256 hash stored in DB.
  //    Plain token is NEVER persisted: it leaves the server only via email.
  const plainToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // 5. Extract and pseudonymize request metadata before storage
  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  const safeUserAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  // 6. Persist token (hash only — plain token never touches the DB)
  await prisma.accountDeletionToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ip: pseudonymize(rawIp),
      userAgent: safeUserAgent,
    },
  });

  // 7. Send confirmation email — plain token travels exactly once, via email only
  const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/account/delete/confirm?token=${plainToken}`;
  await sendDeletionConfirmEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
    to: dbUser.email,
    displayName: dbUser.displayName,
    confirmUrl,
  });

  // 8. Audit trail
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.account.deletion_requested",
      targetType: "User",
      targetId: user.id,
      ipAddress: pseudonymize(rawIp),
      userAgent: safeUserAgent,
    },
  });

  // 202 Accepted — deletion is async, gated behind the email confirmation click
  return NextResponse.json({ message: "Email de confirmation envoyé." }, { status: 202 });
}
