"use server";

import { requireRequestUser } from "@/lib/auth";
import { claimCertificate } from "@/lib/certificates/claim";

// checkAndIssueCertificates used to live here. Every export of a "use server"
// file is a callable endpoint, and it takes a userId parameter, so it let a
// caller mint certificates for an arbitrary account. It now sits in
// @/lib/certificates/check-and-issue, reachable from the server only.

/**
 * Web entry point for the certificate claim on a quiz-less path: the userId is
 * derived from the session (never trusted from the client), then the shared
 * service decides (see @/lib/certificates/claim).
 */
export async function claimCertificateAction(
  pathSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRequestUser();
  return claimCertificate(user.id, pathSlug);
}
