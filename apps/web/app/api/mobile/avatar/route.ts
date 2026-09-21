import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { userFromBearer } from "../_lib/auth";

/**
 * The caller's own avatar, ready to display.
 *
 * The app reads its user row straight from Supabase under RLS, which is fine
 * for everything in it except this one column: `avatarUrl` holds a marker, and
 * turning `__upload:<key>` into something an <Image> can fetch means signing a
 * URL against a private bucket with the service_role key. That key cannot go
 * into a phone, so the signing has to happen here.
 *
 * The effect of it missing was small and completely invisible from the web:
 * somebody who uploaded a photo saw it on the site and saw their initials in
 * the app, because a marker matches none of the shapes the app knows how to
 * draw and it fell through to the fallback.
 *
 * Only ever the caller's own avatar. A route that signed any user's would be a
 * way to enumerate the bucket, and nothing in the app needs it: the one place
 * an avatar is drawn is the profile tab.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });
    // Null for somebody with no avatar, and null again if signing failed -
    // both mean "draw the initials", which is what the app does with null.
    const avatarUrl = await resolveAvatarSrc(row?.avatarUrl ?? null);
    return NextResponse.json({ ok: true, avatarUrl });
  } catch (err) {
    console.error(
      "[mobile/avatar] resolve error:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ ok: false, error: "Avatar indisponible." }, { status: 500 });
  }
}
