import React from "react";
import Link from "next/link";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { certificateCode } from "@cyberlearn/lib/social/certificate-code";
import { BastionLogo } from "@/components/bastion-logo";
import "./certificates.css";

/** One certificate as the tab shows it (certificateRepository.listForUser). */
export interface CertificateRow {
  id: string;
  publicId: string;
  issuedAt: Date;
  score: number | null;
  sha256Hash: string;
  revokedAt: Date | null;
  revokedReason: string | null;
  path: {
    title: string;
    category: string;
    difficulty: string;
    estimatedHours: number;
  };
}

/**
 * The profile's Certificats tab: every certificate of the account, a revoked
 * one kept, dimmed, with its reason. It was the /certificates page; the
 * profile's own header now stands above it, so it opens on an h2.
 */
export function CertificatesList({
  certs,
}: {
  certs: readonly CertificateRow[];
}): React.ReactElement {
  const activeCerts = certs.filter((c) => !c.revokedAt);
  const revokedCerts = certs.filter((c) => c.revokedAt);
  const totalHours = activeCerts.reduce((sum, c) => sum + c.path.estimatedHours, 0);
  const isEmpty = certs.length === 0;

  return (
    <div className="progression-workspace certificates-workspace">
      <h2>Tes certificats</h2>
      <div className="catalogue-ledger">
        <span>
          <b>{activeCerts.length}</b> actif{activeCerts.length !== 1 ? "s" : ""}
        </span>
        <span>
          <b>{revokedCerts.length}</b> révoqué{revokedCerts.length !== 1 ? "s" : ""}
        </span>
        <span className="catalogue-ledger__total">~{totalHours} h validées</span>
      </div>
      {isEmpty ? (
        <section className="certificate-next">
          <div className="certificate-next__brand">
            <BastionLogo size={64} />
            <span>Bastion / CyberLearn</span>
          </div>
          <div className="certificate-next__body">
            <p className="workspace-kicker">Ton prochain cap</p>
            <h2>
              Un parcours terminé.
              <br />
              Une trace à partager.
            </h2>
            <p>
              Termine toutes les missions d’un parcours, puis son examen final. Ton certificat
              apparaîtra ici, avec son PDF et son lien de vérification.
            </p>
            <div className="workspace-actions">
              <Link href="/paths" className="btn">
                Choisir un parcours <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="certificate-grid">
          {certs.map((cert) => {
            const diff = difficultyMeta(cert.path.difficulty);
            const cat = categoryMeta(cert.path.category).label;
            const issuedAt = new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(cert.issuedAt);
            const isRevoked = !!cert.revokedAt;
            const certRef = certificateCode(cert.publicId, cert.issuedAt);
            const hashSnippet = `${cert.sha256Hash.slice(0, 10)}…${cert.sha256Hash.slice(-4)}`;
            return (
              <article key={cert.id} className="certificate-record" data-revoked={isRevoked}>
                <div className="certificate-record__top">
                  <BastionLogo size={42} />
                  <span>{isRevoked ? "Révoqué" : "Certificat délivré"}</span>
                </div>
                <div className="certificate-record__body">
                  <p className="certificate-record__reference">{certRef}</p>
                  <h3>{cert.path.title}</h3>
                  <p className="certificate-record__meta">
                    <span>{cat}</span>
                    <span>{diff.label}</span>
                    <span>~{cert.path.estimatedHours} h</span>
                  </p>
                  <dl>
                    <div>
                      <dt>Délivré le</dt>
                      <dd>{issuedAt}</dd>
                    </div>
                    {cert.score !== null && (
                      <div>
                        <dt>Score examen</dt>
                        <dd>{cert.score}%</dd>
                      </div>
                    )}
                    <div>
                      <dt>SHA-256</dt>
                      <dd>{hashSnippet}</dd>
                    </div>
                    {isRevoked && cert.revokedReason && (
                      <div>
                        <dt>Motif</dt>
                        <dd>{cert.revokedReason}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                {!isRevoked && (
                  <div className="certificate-record__actions">
                    <Link href={`/verify/${cert.publicId}`}>Vérifier ↗</Link>
                    <a href={`/api/certificates/${cert.id}/download`} download>
                      Télécharger PDF ↓
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
