import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { certificateRepository } from "@cyberlearn/db";
import {
  parseCertificateReference,
  pickCertificateByPrefix,
} from "@cyberlearn/lib/social/certificate-code";

/** What the verification page shows of a certificate. */
export type VerifiedCertificate = NonNullable<
  Awaited<ReturnType<typeof certificateRepository.findByPublicId>>
>;

/** What the segment of /verify/<segment> designates. */
export type CertificateLookup =
  | { kind: "found"; certificate: VerifiedCertificate }
  /** A short number or a non-canonical id: the certificate lives at its full address. */
  | { kind: "moved"; publicId: string }
  | { kind: "missing" };

/**
 * Reads the segment of /verify/<segment>: the public id, or the short number
 * printed on a PDF ("CL-2026-1A2B3C4D", the address cut to eight characters
 * that the PDFs issued before carried), matched to the one certificate it
 * designates. Read once per request: the layout, the metadata and the page all
 * ask.
 */
export const lookupCertificate = cache(async (segment: string): Promise<CertificateLookup> => {
  const reference = parseCertificateReference(segment);
  if (reference === null) return { kind: "missing" };

  if (reference.kind === "prefix") {
    const candidates = await certificateRepository.findByPublicIdPrefix(reference.prefix);
    const publicId = pickCertificateByPrefix(candidates, reference.year);
    return publicId === null ? { kind: "missing" } : { kind: "moved", publicId };
  }

  if (reference.publicId !== segment) return { kind: "moved", publicId: reference.publicId };
  const certificate = await certificateRepository.findByPublicId(reference.publicId);
  return certificate === null ? { kind: "missing" } : { kind: "found", certificate };
});

/**
 * The certificate the segment designates, or the 404 or the redirect to its
 * full address. Called by the segment's layout, which renders before the
 * skeleton (loading.tsx) opens its Suspense boundary: thrown from the page
 * alone, the 404 came after the stream had started with a 200, and link
 * checkers (a recruiter's among them) took an unknown certificate for a valid
 * address.
 */
export async function requireCertificate(segment: string): Promise<VerifiedCertificate> {
  const lookup = await lookupCertificate(segment);
  if (lookup.kind === "missing") notFound();
  if (lookup.kind === "moved") redirect(`/verify/${lookup.publicId}`);
  return lookup.certificate;
}
