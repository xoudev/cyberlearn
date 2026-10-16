import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { certificateFilename } from "@/lib/certificates/filename";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { requestLogger } from "@/lib/request-logger";

const BUCKET = "certificates";
const SIGNED_TTL = 60; // 60 seconds - short-lived to limit forwarding window

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  // The id column is a uuid: anything else made Postgres throw, answered 500.
  const parsed = z.guid().safeParse((await params).id);
  if (!parsed.success) return new Response(null, { status: 404 });
  const id = parsed.data;

  // getUser() validates the JWT server-side; getSession() only reads the cookie
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 404 });

  // Ownership + revocation checked in a single query - no sequential disclosure
  const cert = await prisma.certificate.findFirst({
    where: { id, userId: user.id, revokedAt: null },
    select: { pdfStorageKey: true, path: { select: { title: true } } },
  });

  if (!cert || cert.pdfStorageKey === "pending") {
    const log = await requestLogger();
    log.warn(
      { scope: "certificates/download", certId: id, actorId: user.id },
      "not found or pending",
    );
    return new Response(null, { status: 404 });
  }

  const filename = certificateFilename(cert.path.title);

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(cert.pdfStorageKey, SIGNED_TTL, { download: filename });

  if (!data) {
    const log = await requestLogger();
    log.error(
      { scope: "certificates/download", certId: id, err: error.message },
      "signed url error",
    );
    return new Response(null, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
