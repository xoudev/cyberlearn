import { type NextRequest, NextResponse } from "next/server";
import { appealBan, currentAppeal } from "@/lib/moderation/ban-appeal";
import { identityFromBearer } from "../../_lib/auth";

/**
 * Where the banned mobile user's appeal stands: its stage in the site's words
 * and the team's last written answer. The appeal's ticket is behind the ban
 * gate for its own author, on the app as on the site, so this is the one way
 * the app can show the answer. `appeal` is null when no appeal was filed, or
 * the account has no ban in force.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await identityFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, appeal: await currentAppeal(user.id) });
}

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
