import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { AVATAR_UPLOAD_ERROR, AVATAR_UPLOAD_MAX_BYTES } from "@cyberlearn/types";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { setAvatarPhotoFor } from "@/lib/avatar/upload";
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

/** The photo's cap plus room for the multipart envelope around it. */
const MAX_REQUEST_BYTES = AVATAR_UPLOAD_MAX_BYTES + 64 * 1024;

/**
 * Sends a photo as the caller's avatar: a multipart body with one `avatar`
 * file, checked and stored by the site's service (type allowlist, 2 Mo cap,
 * magic bytes, private bucket). Answers with the new avatar already signed,
 * so the app can draw it at once.
 *
 * A declared length over the cap is refused before the body is read.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, error: AVATAR_UPLOAD_ERROR.tooLarge }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const result = await setAvatarPhotoFor(user.id, form.get("avatar"));
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  // Null if signing fails: the photo is saved, and the app draws initials
  // until it next asks, as GET does.
  const avatarUrl = await resolveAvatarSrc(result.marker).catch(() => null);
  return NextResponse.json({ ok: true, avatarUrl });
}
