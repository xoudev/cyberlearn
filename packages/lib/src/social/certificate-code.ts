/**
 * The number a certificate goes by, and every way a reader may hand one back.
 *
 * Four screens used to print four different numbers: the PDF "CL-2026-" and
 * six characters of the public id, the verification page "CYL-2026-09-" and
 * four characters of the internal id, the holder's list "CERT-" and eight
 * characters of the public id, and the PDF's footer an address cut to eight
 * characters that the verification page answered with "introuvable". A
 * recruiter holding the paper could only check it through the QR code, and
 * then read a number on the page that did not match the one on the paper.
 *
 * One number now, derived from the public id, and the verification page reads
 * it back, along with the full id, the full address and the address cut to
 * eight characters that the PDFs issued before printed.
 *
 * Never fewer than eight characters: a short number opens a public page that
 * names the holder, and six would leave 16 million values to try, few enough
 * to walk through and collect the names of holders who never shared their
 * certificate. The six-character number of the older PDFs is therefore not
 * read; the address printed under it is.
 */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu;

/** Characters of the public id the number carries, and that a short form must. */
export const CERTIFICATE_CODE_LENGTH = 8;

/**
 * "CL-2026-1A2B3C4D": the year of issue, in UTC like the date the PDF prints,
 * and the first eight characters of the public id.
 */
export function certificateCode(publicId: string, issuedAt: Date | string): string {
  const year = new Date(issuedAt).getUTCFullYear();
  return `CL-${String(year)}-${publicId.slice(0, CERTIFICATE_CODE_LENGTH).toUpperCase()}`;
}

/** What a reader typed, or the address they followed, once read. */
export type CertificateReference =
  /** The whole public id: the certificate itself. */
  | { kind: "publicId"; publicId: string }
  /**
   * The start of a public id, and the year when the number gave one: what the
   * PDF prints, which the server still has to match to a single certificate.
   */
  | { kind: "prefix"; prefix: string; year: number | null };

const CODE_RE = /^CL-(\d{4})-([0-9a-f]{8})$/iu;
const LEGACY_LABEL_RE = /^CERT-([0-9a-f]{8})$/iu;
const VERIFY_SEGMENT_RE = /(?:^|\/)verify\/([^/?#\s]+)/iu;
const BARE_PREFIX_RE = /^[0-9a-f]{8}$/iu;

/**
 * Reads a certificate reference: the public id, the verification address
 * (with or without its scheme), the number "CL-2026-1A2B3C4D", or one of the
 * short forms shown before: the address cut to eight characters, the
 * "CERT-1A2B3C4D" of the holder's list. Anything else is null.
 */
export function parseCertificateReference(input: string): CertificateReference | null {
  const raw = input.trim().replace(/^#/u, "").trim();
  if (raw === "") return null;

  const uuid = UUID_RE.exec(raw);
  if (uuid !== null) return { kind: "publicId", publicId: uuid[0].toLowerCase() };

  // An address: only its /verify/ segment counts.
  const segment = VERIFY_SEGMENT_RE.exec(raw)?.[1] ?? raw;

  const code = CODE_RE.exec(segment);
  if (code !== null) {
    return { kind: "prefix", prefix: (code[2] ?? "").toLowerCase(), year: Number(code[1]) };
  }
  const legacy = LEGACY_LABEL_RE.exec(segment);
  if (legacy !== null)
    return { kind: "prefix", prefix: (legacy[1] ?? "").toLowerCase(), year: null };
  if (BARE_PREFIX_RE.test(segment))
    return { kind: "prefix", prefix: segment.toLowerCase(), year: null };
  return null;
}

/**
 * The path segment of the verification page a reference opens: the public id
 * itself, or the number (or the bare prefix), which the page then resolves.
 */
export function certificateReferenceSegment(reference: CertificateReference): string {
  if (reference.kind === "publicId") return reference.publicId;
  if (reference.year === null) return reference.prefix;
  return `CL-${String(reference.year)}-${reference.prefix.toUpperCase()}`;
}

/**
 * The bounds of the public ids that start with a prefix, for a range query on
 * the uuid column: Postgres orders uuids byte by byte, which is the order of
 * their hex digits.
 */
export function publicIdPrefixRange(prefix: string): { gte: string; lte: string } {
  const hex = prefix.toLowerCase();
  const pad = 32 - hex.length;
  return { gte: asUuid(hex + "0".repeat(pad)), lte: asUuid(hex + "f".repeat(pad)) };
}

function asUuid(hex: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * The one certificate a prefix designates among those that start with it, or
 * null when none does or several still do. A number carries its year, and a
 * certificate issued another year is not the one it names: the page must not
 * vouch for a number that was never printed.
 */
export function pickCertificateByPrefix(
  candidates: readonly { publicId: string; issuedAt: Date | string }[],
  year: number | null,
): string | null {
  const rows =
    year === null
      ? candidates
      : candidates.filter((c) => new Date(c.issuedAt).getUTCFullYear() === year);
  return rows.length === 1 ? (rows[0]?.publicId ?? null) : null;
}
