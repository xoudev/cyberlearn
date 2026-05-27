import { NextResponse } from "next/server";

// Dev-only endpoint to validate Sentry server-side error capture.
// Blocked in production unless NEXT_PUBLIC_ENABLE_SENTRY_TEST=true.
// To be removed in PR 4 (cleanup test endpoints).
export async function GET() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_SENTRY_TEST === "true";
  if (!enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  throw new Error("Sentry test — server-side error from /api/dev/sentry-test");
}
