import { type NextRequest, NextResponse } from "next/server";
import { updateProfileFor } from "@/lib/profile/update-profile";
import { userFromBearer } from "../../_lib/auth";

/**
 * Edits the caller's own profile, `{ displayName, bio, avatarUrl? }`, through
 * the site's service: the same limits, and an avatar only ever set to one of
 * the built-in ones (an uploaded photo or a glyph is kept as it is).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const read = (key: string): unknown =>
    typeof body === "object" && body !== null && key in body
      ? // SAFETY: a non-null object that has the key; its value stays unknown
        // and the service validates it.
        (body as Record<string, unknown>)[key]
      : null;

  const result = await updateProfileFor(user.id, {
    displayName: read("displayName"),
    bio: read("bio"),
    avatarUrl: read("avatarUrl"),
  });
  return result.success
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: result.error }, { status: 409 });
}
