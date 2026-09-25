import { type NextRequest, NextResponse } from "next/server";
import { moderationRepository } from "@cyberlearn/db";
import { userFromBearer } from "../_lib/auth";

/**
 * The reader's own moderation record, as /settings/moderation shows it: when,
 * where, the excerpt, how it ended. Served by the API because the table is
 * readable by admins only under RLS: each row also carries the score and the
 * rules that fired, which the author is never shown. The repository's select
 * already leaves them out, and this route sends only what it selected.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const events = await moderationRepository.findForUser(user.id);
  return NextResponse.json({
    ok: true,
    events: events.map((event) => ({
      id: event.id,
      surface: event.surface,
      excerpt: event.excerpt,
      outcome: event.outcome,
      createdAt: event.createdAt.toISOString(),
      reviewedAt: event.reviewedAt?.toISOString() ?? null,
    })),
  });
}
