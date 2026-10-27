import React from "react";
import type { Metadata } from "next";
import { pageAddress } from "@/app/page-metadata";
import { getRequestUser } from "@/lib/auth";
import { lookupCertificate, requireCertificate } from "@/lib/certificates/lookup";
import { CertificateDocument, holderNameOf } from "./_components/certificate-document";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  const lookup = await lookupCertificate(publicId);
  if (lookup.kind !== "found") return { title: "Certificat introuvable" };
  const cert = lookup.certificate;
  // The frozen name printed on the PDF, not the one the account carries now.
  const holder = holderNameOf(cert);
  // The link a holder shares, on LinkedIn or anywhere: its preview names the
  // certificate and leads back here, not to the home page. The address is
  // built from the stored id, not the one typed: Postgres matches a uuid
  // whatever its case, so /verify/ABCD… and /verify/abcd… show the same
  // certificate, and both must name the one address.
  const address = pageAddress(`/verify/${cert.publicId.toLowerCase()}`);
  // A preview fetched after the console revoked it must not still present a
  // valid certificate, in a browser tab or under a link shared before.
  if (cert.revokedAt !== null) {
    return {
      title: `Certificat révoqué · ${holder ?? "Certificat"} · ${cert.path.title}`,
      description: `Ce certificat CyberLearn du parcours « ${cert.path.title} »${
        holder === null ? "" : `, délivré à ${holder},`
      } a été révoqué : il ne vaut plus preuve de complétion.`,
      ...address,
    };
  }
  return {
    title: `Certificat · ${holder ?? "Certificat"} · ${cert.path.title}`,
    description: `Certificat CyberLearn du parcours « ${cert.path.title} »${
      holder === null ? "" : ` délivré à ${holder}`
    }. Son authenticité se vérifie sur cette page.`,
    ...address,
  };
}

export default async function CertVerifyPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<React.ReactElement> {
  const { publicId } = await params;
  const cert = await requireCertificate(publicId);
  const viewer = await getRequestUser();
  const isHolder = viewer !== null && cert.userId !== null && viewer.id === cert.userId;
  return <CertificateDocument cert={cert} isHolder={isHolder} />;
}
