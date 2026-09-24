import { type NextRequest, NextResponse } from "next/server";
import { claimCertificate } from "@/lib/certificates/claim";
import { userFromBearer } from "../../_lib/auth";

/**
 * Claims the certificate of a quiz-less path whose lessons the mobile user has
 * all completed, through the site's service. The fallback for a path that
 * missed the automatic issuance at its last lesson; a path with an exam is
 * refused, its certificate comes with a pass.
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
  // SAFETY: an unknown JSON body; pathSlug is validated by the service.
  const { pathSlug } = (body ?? {}) as { pathSlug?: unknown };

  const result = await claimCertificate(user.id, pathSlug);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
