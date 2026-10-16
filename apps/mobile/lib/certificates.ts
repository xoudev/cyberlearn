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
