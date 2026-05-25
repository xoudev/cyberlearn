import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { prisma } from "@cyberlearn/db";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pseudonymize } from "@/lib/pseudonymize";
import { deleteAccount } from "@/lib/rgpd/delete-account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// base64url alphabet only — rejects any value that can't be a valid token
const tokenParamSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = new URL(request.url).origin;
  const rawToken = request.nextUrl.searchParams.get("token");

  // ── 1. Validate query param ──────────────────────────────────────────────
  if (!rawToken) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=missing", origin));
  }

  const parsed = tokenParamSchema.safeParse(rawToken);
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=invalid", origin));
  }

  // ── 2. Hash and look up ──────────────────────────────────────────────────
  const tokenHash = createHash("sha256").update(parsed.data).digest("hex");

  const record = await prisma.accountDeletionToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=invalid", origin));
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=expired", origin));
  }
  if (record.usedAt !== null) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=used", origin));
  }

  // ── 3. Consume token before deletion — prevents double-fire on retried requests ──
  await prisma.accountDeletionToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  // ── 4. Extract metadata ──────────────────────────────────────────────────
  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  const rawUserAgent = request.headers.get("user-agent") ?? "";

  // ── 5. Delete app data (Prisma atomic transaction) ───────────────────────
  try {
    await deleteAccount(record.userId, { ip: rawIp, userAgent: rawUserAgent });
  } catch (err) {
    console.error("[delete/confirm] deleteAccount failed:", err);
    return NextResponse.redirect(new URL("/account/delete/error?reason=internal", origin));
  }

  // ── 6. Delete Supabase Auth identity (RGPD Art. 17 — full erasure) ───────
  // deleteAccount() removes the row from public.users; this removes auth.users.
  // Both must succeed for a complete RGPD deletion.
  const supabaseAdmin = createSupabaseAdminClient();
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(record.userId);

  if (authDeleteError) {
    const hashedId = pseudonymize(record.userId);
    console.error("[rgpd] Supabase Auth deletion failed", {
      hashedUserId: hashedId,
      error: authDeleteError.message,
    });
    await prisma.auditLog.create({
      data: {
        actorId: null,
        actorHashedId: hashedId,
        action: "user.account.auth_delete_failed",
        targetType: "user",
        targetId: hashedId,
        anonymized: true,
        metadata: { error: authDeleteError.message },
      },
    });
    return NextResponse.redirect(
      new URL("/account/delete/error?reason=auth_cleanup_failed", origin),
    );
  }

  // ── 7. Sign out — wipes session cookies so the deleted user can't keep browsing ──
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      toSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/account/delete/success", origin));
}
