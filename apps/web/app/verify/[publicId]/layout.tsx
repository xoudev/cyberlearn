import React from "react";
import { requireCertificate } from "@/lib/certificates/lookup";

/**
 * Decides whether the certificate exists before anything is sent.
 *
 * The skeleton (loading.tsx) wraps the page in a Suspense boundary, so the
 * response started as a 200 and the page's notFound() arrived too late to
 * change it: an unknown certificate, or the short address printed on the PDFs,
 * answered 200 to search engines and link checkers. This layout sits outside
 * that boundary, so the 404, or the redirect from a short number to the full
 * address, is the response itself. The lookup is cached for the request: the
 * page reads the same row.
 */
export default async function CertificateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ publicId: string }>;
}): Promise<React.ReactElement> {
  const { publicId } = await params;
  await requireCertificate(publicId);
  return <>{children}</>;
}
