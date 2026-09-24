import { type NextRequest, NextResponse } from "next/server";
import { appealBan } from "@/lib/moderation/ban-appeal";
import { identityFromBearer } from "../../_lib/auth";

/**
 * The banned mobile user's appeal, through the site's service: one per ban,
 * rate-limited like the contact form, filed as a BAN_APPEAL ticket. Reached
 * through identityFromBearer, not userFromBearer: answering the decision is
 * one of the two things a banned account may still do.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await identityFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  // SAFETY: an unknown JSON body; the message is validated by the service.
  const { message } = (body ?? {}) as { message?: unknown };
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const result = await appealBan({ userId: user.id, fallbackEmail: user.email, message, ip });
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { ok: false, error: result.error ?? "L'appel n'a pas pu être envoyé." },
    { status: 409 },
  );
}
