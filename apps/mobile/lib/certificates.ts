/**
 * A holder's certificates, as the app reads them through the Data API.
 *
 * The home screen's "Certificats" tile counted on `id`, a column the Data API
 * does not grant: 20260725000000_rls_column_hardening revoked the table from
 * the client roles and granted back `publicId`, `userId`, `pathId`, `score`,
 * `issuedAt`, `expiresAt` and `revokedAt`. Every count failed with "permission
 * denied", the error went unread, and `count ?? 0` drew 0 for every holder
 * while the site and the profile's Certificats tab listed theirs.
 */

/** The column the count runs on: one the Data API lets a holder read. */
export const CERTIFICATE_COUNT_COLUMN = "publicId";

/**
 * The count a head request answered. A failed request throws rather than
 * reading as zero: a silent 0 is what hid the refused column.
 */
export function certificateCountOf(res: {
  count: number | null;
  error: { message: string } | null;
}): number {
  if (res.error !== null) throw new Error(res.error.message);
  return res.count ?? 0;
}

/**
 * The columns the profile reads of each certificate. The reason was granted
 * with the console's revocation (20261017140000_certificate_revocation): the
 * list shows a revoked certificate with it, as the site's /certificates does.
 */
export const CERTIFICATE_LIST_COLUMNS =
  "publicId,score,issuedAt,revokedAt,revokedReason, paths(title)";

/** Whether a certificate still stands, and why not when it does not. */
export interface CertificateStanding {
  revokedAt: string | null;
  revokedReason: string | null;
}

/** The certificates still valid: the ones the profile counts, as the site and the home screen do. */
export function validCertificates<T extends CertificateStanding>(list: readonly T[]): T[] {
  return list.filter((c) => c.revokedAt === null);
}

/**
 * What a revoked certificate says under its title: the day, and the reason
 * when the console gave one. Null for a valid certificate.
 */
export function revocationLine(
  standing: CertificateStanding,
  formatDay: (iso: string) => string,
): string | null {
  if (standing.revokedAt === null) return null;
  const day = `Révoqué le ${formatDay(standing.revokedAt)}`;
  const reason = standing.revokedReason?.trim() ?? "";
  return reason === "" ? day : `${day} · ${reason}`;
}

/**
 * "cyberlearn.fr/verify": where anyone checks a certificate, on the site the
 * app is pointed at rather than the production address written in.
 */
export function verifyPageLabel(siteUrl: string): string {
  return `${siteUrl.replace(/^https?:\/\//u, "").replace(/\/+$/u, "")}/verify`;
}
