import { NextResponse } from "next/server";
import { prisma } from "@cyberlearn/db";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";

const BUCKET = "certificates";
const SIGNED_TTL = 60 * 60; // 1 hour

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const cert = await prisma.certificate.findUnique({
    where: { id },
    select: { pdfStorageKey: true, revokedAt: true, path: { select: { title: true } } },
  });

  if (!cert || cert.revokedAt !== null || cert.pdfStorageKey === "pending") {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(cert.pdfStorageKey, SIGNED_TTL, {
      download: `CyberLearn - ${cert.path.title}.pdf`,
    });

  if (error ?? !data) {
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
