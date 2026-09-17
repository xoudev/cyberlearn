import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { deleteAccount, prisma } from "@cyberlearn/db";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// base64url alphabet only - rejects any value that can't be a valid token
const tokenParamSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);

/**
 * Showing the confirmation page is the only thing a link click may do.
 * Deleting an account is irreversible, so it must not ride on a GET: mail
 * clients, security scanners and link prefetchers follow links on their own,
 * which silently destroyed accounts. The destructive step is POST below,
 * reached from a form the account holder actually submits.
 */
export function GET(request: NextRequest): NextResponse {
  const origin = new URL(request.url).origin;
  const rawToken = request.nextUrl.searchParams.get("token");

  if (!rawToken) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=missing", origin));
  }
  if (!tokenParamSchema.safeParse(rawToken).success) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=invalid", origin));
  }

  const confirmPage = new URL("/account/delete/confirm", origin);
  confirmPage.searchParams.set("token", rawToken);
  return NextResponse.redirect(confirmPage);
}

/** The confirmation page submits a form; the query string stays supported. */
async function readToken(request: NextRequest): Promise<string | undefined> {
  const fromQuery = request.nextUrl.searchParams.get("token");
  if (fromQuery) return fromQuery;
  // formData() throws outright on a non-form content type.
  const contentType = request.headers.get("content-type") ?? "";
  if (!/form-data|x-www-form-urlencoded/.test(contentType)) return undefined;
  try {
    const value = (await request.formData()).get("token");
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = new URL(request.url).origin;
  const rawToken = await readToken(request);

  // ── 1. Validate query param ──────────────────────────────────────────────
  if (!rawToken) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=missing", origin), 303);
  }

  const parsed = tokenParamSchema.safeParse(rawToken);
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=invalid", origin), 303);
  }

  // ── 2. Hash and look up ──────────────────────────────────────────────────
  const tokenHash = createHash("sha256").update(parsed.data).digest("hex");

  const record = await prisma.accountDeletionToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=invalid", origin), 303);
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=expired", origin), 303);
  }
  if (record.usedAt !== null) {
    return NextResponse.redirect(new URL("/account/delete/error?reason=used", origin), 303);
  }

  // ── 3. Consume token before deletion - prevents double-fire on retried requests ──
  await prisma.accountDeletionToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  // ── 4. Extract metadata ──────────────────────────────────────────────────
  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  const rawUserAgent = request.headers.get("user-agent") ?? "";

  // ── 5. Erase the account (app data, files, and the auth identity) ────────
  // deleteAccount owns all three now, so the console's delete button cannot
  // erase a different amount than this route does.
  let summary;
  try {
    summary = await deleteAccount(record.userId, {
      ip: rawIp,
      userAgent: rawUserAgent,
      onCleanupError: (area, error, context) => {
        Sentry.captureException(error, { tags: { area }, extra: context });
      },
    });
  } catch (err) {
    console.error("[delete/confirm] deleteAccount failed:", err);
    return NextResponse.redirect(new URL("/account/delete/error?reason=internal", origin), 303);
  }

  // ── 6. The data is gone either way; a surviving identity is a loose end ──
  // deleteAccount has already written the audit row and reported it. What is
  // left to decide here is what the person is shown, and they are told, because
  // an identity that can still sign in is something they would want to know.
  if (!summary.authIdentityDeleted) {
    return NextResponse.redirect(
      new URL("/account/delete/error?reason=auth_cleanup_failed", origin),
      303,
    );
  }

  // ── 7. Sign out - wipes session cookies so the deleted user can't keep browsing ──
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

  return NextResponse.redirect(new URL("/account/delete/success", origin), 303);
}
