import { NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "certificates";
const SIGNED_TTL = 60; // 60 seconds - short-lived to limit forwarding window

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

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
    console.warn("[certificates/download] not found or pending", {
      certId: id,
      actorId: user.id,
    });
    return new Response(null, { status: 404 });
  }

  const safeTitle = cert.path.title
    .replace(/[^a-zA-Z0-9 \-_]/g, "")
    .trim()
    .slice(0, 80);
  const filename = safeTitle ? `CyberLearn - ${safeTitle}.pdf` : "CyberLearn - Certificate.pdf";

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(cert.pdfStorageKey, SIGNED_TTL, { download: filename });

  if (!data) {
    console.error("[certificates/download] signed url error", {
      certId: id,
      code: error.message,
    });
    return new Response(null, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
