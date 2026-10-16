import {
  certificateReferenceSegment,
  parseCertificateReference,
} from "@cyberlearn/lib/social/certificate-code";

/**
 * Shown under a reference the form cannot read. The older PDFs printed a
 * six-character number the page no longer reads: their address, at the
 * bottom, is what opens them.
 */
export const INVALID_REFERENCE =
  "Référence invalide. Entre le numéro du certificat (CL-, l'année et huit caractères) ou l'adresse de vérification imprimée en bas.";

/**
 * The page a reference opens, or null when it is none. The form took only the
 * full identifier, while a printed certificate shows its number and its
 * address: both are read here, and the verification page resolves a number to
 * the certificate it designates.
 */
export function verifyTarget(input: string): string | null {
  const reference = parseCertificateReference(input);
  if (reference === null) return null;
  return `/verify/${encodeURIComponent(certificateReferenceSegment(reference))}`;
}
