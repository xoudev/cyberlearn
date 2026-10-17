import React from "react";
import type { certificateRepository } from "@cyberlearn/db";
import { certificateCode } from "@cyberlearn/lib/social/certificate-code";
import { learnerUrl } from "@/lib/learner-url";
import { Card, Tag } from "../../../_components/admin-ui";
import { formatDay } from "../../_components/dates";

type CertificateRow = Awaited<ReturnType<typeof certificateRepository.findAllForConsole>>[number];

/** The public verification page of a certificate, or null on a misconfigured deployment. */
function verifyUrl(publicId: string): string | null {
  try {
    return learnerUrl(`/verify/${publicId}`);
  } catch {
    // learnerUrl refuses the console's own address; the row stays readable.
    return null;
  }
}

/**
 * Every certificate of the account, the revoked ones included, with the
 * number it goes by and the public page anybody can check it on.
 */
export function CertificatesPanel({
  certificates,
}: {
  certificates: CertificateRow[];
}): React.ReactElement {
  const valid = certificates.filter((certificate) => certificate.revokedAt === null).length;
  return (
    <Card title={`Attestations · ${String(valid)} valide${valid > 1 ? "s" : ""}`}>
      {certificates.length === 0 ? (
        <div className="a-card-pad">
          <p className="a-field-hint">Ce compte n&apos;a reçu aucune attestation.</p>
        </div>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <tbody>
              {certificates.map((certificate) => {
                const url = verifyUrl(certificate.publicId);
                return (
                  <tr key={certificate.id}>
                    <td>
                      <span className="a-row-link-title">{certificate.path.title}</span>
                      <div className="mono a-field-hint">
                        {certificateCode(certificate.publicId, certificate.issuedAt)} · émise le{" "}
                        {formatDay(certificate.issuedAt)}
                        {certificate.score !== null ? ` · ${String(certificate.score)} %` : ""}
                      </div>
                      {certificate.revokedAt !== null && certificate.revokedReason !== null && (
                        <div className="a-field-hint">Motif : {certificate.revokedReason}</div>
                      )}
                    </td>
                    <td>
                      {certificate.revokedAt === null ? (
                        <Tag tone="accent">valide</Tag>
                      ) : (
                        <Tag tone="danger">révoquée le {formatDay(certificate.revokedAt)}</Tag>
                      )}
                    </td>
                    <td align="right">
                      {url !== null && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="a-btn a-btn--ghost a-btn--sm"
                        >
                          Vérifier ↗
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
