import React from "react";
import { certificateCode } from "@cyberlearn/lib/social/certificate-code";
import { certificateVerifyUrl, linkedInCertificateUrl } from "@cyberlearn/lib/social/portfolio";
import type { VerifiedCertificate } from "@/lib/certificates/lookup";
import { BastionLogo } from "@/components/bastion-logo";
import { VerificationFrame } from "../../_components/verification-frame";
import { ShareCertificateButton } from "./share-certificate-button";

// The frozen name on the issued PDF takes precedence over the current profile name.
export function holderNameOf(cert: VerifiedCertificate): string | null {
  return cert.holderName ?? cert.user?.displayName ?? null;
}

export function CertificateDocument({
  cert,
  isHolder,
}: {
  cert: VerifiedCertificate;
  isHolder: boolean;
}): React.ReactElement {
  const isRevoked = cert.revokedAt !== null;
  const issuedStr = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(cert.issuedAt);
  const verifiedStr = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const revokedStr = cert.revokedAt
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(cert.revokedAt)
    : null;
  const lessonCount = cert.lessonCount ?? cert.path._count.lessons;
  const hashGrouped = (cert.sha256Hash.match(/.{1,16}/g) ?? []).join(" · ");
  const certCode = certificateCode(cert.publicId, cert.issuedAt);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr";
  const issuerHost = siteUrl.replace(/^https?:\/\//, "");
  const verifyUrl = certificateVerifyUrl(siteUrl, cert.publicId);

  return (
    <VerificationFrame detail>
      <section
        className="verification-status"
        data-revoked={isRevoked ? "true" : undefined}
        aria-label="Statut du certificat"
      >
        <div>
          <h2>{isRevoked ? "Certificat révoqué" : "Certificat valide"}</h2>
          <p>
            {isRevoked
              ? "Ce certificat n’est plus valide."
              : "Ce certificat figure dans le registre CyberLearn."}
          </p>
        </div>
        <p>{isRevoked ? `Révoqué le ${revokedStr ?? ""}` : `Vérifié le ${verifiedStr}`}</p>
      </section>
      <article className="verification-document" aria-labelledby="certificate-holder">
        <header className="verification-document__header">
          <div className="verification-document__brand">
            <BastionLogo size={36} />
            <span>
              CyberLearn<b>.</b>
              <small>Certificat de complétion</small>
            </span>
          </div>
          <div>
            <p>Certificat N°</p>
            <strong>{certCode}</strong>
          </div>
        </header>
        <p className="verification-document__label">Décerné à</p>
        <h1 id="certificate-holder">{holderNameOf(cert) ?? "Utilisateur supprimé"}</h1>
        {cert.user?.username != null && (
          <p className="verification-document__username">@{cert.user.username}</p>
        )}
        <p className="verification-document__label">Pour avoir complété le parcours</p>
        <h2>{cert.path.title}</h2>
        <dl className="verification-document__facts">
          <div>
            <dt>Délivré le</dt>
            <dd>{issuedStr}</dd>
          </div>
          <div>
            <dt>Score final</dt>
            <dd>{cert.score !== null ? `${String(cert.score)} / 100` : "-"}</dd>
          </div>
          <div>
            <dt>Missions</dt>
            <dd>
              {String(lessonCount)} / {String(lessonCount)}
            </dd>
          </div>
        </dl>
        <footer className="verification-fingerprint">
          <h3>Empreinte cryptographique · SHA-256</h3>
          <p>
            <span>{hashGrouped}</span>
          </p>
        </footer>
      </article>
      {isRevoked && cert.revokedReason && (
        <section className="verification-revocation" aria-label="Motif de révocation">
          <h2>Motif de révocation</h2>
          <p>
            Révoqué le {revokedStr} · Raison : <span>{cert.revokedReason}</span>
            {/[.!?…]$/u.test(cert.revokedReason.trim()) ? "" : "."}
          </p>
          <p>
            Ce certificat a été retiré du registre public et ne peut plus être utilisé comme preuve
            de complétion.
          </p>
        </section>
      )}
      {!isRevoked && (
        <div className="verification-actions">
          {isHolder && (
            <a className="btn" href={`/api/certificates/${cert.id}/download`} download>
              Télécharger le PDF
            </a>
          )}
          <ShareCertificateButton url={verifyUrl} />
          {isHolder && (
            <a
              className="btn btn--ghost"
              href={linkedInCertificateUrl({
                name: cert.path.title,
                issuedAt: cert.issuedAt,
                publicId: cert.publicId,
                verifyUrl,
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ajouter à LinkedIn
            </a>
          )}
        </div>
      )}
      <dl className="verification-metadata">
        <div>
          <dt>Plateforme</dt>
          <dd>Cyber Learn</dd>
        </div>
        <div>
          <dt>Émetteur</dt>
          <dd>{issuerHost}</dd>
        </div>
        <div>
          <dt>Algorithme</dt>
          <dd>SHA-256</dd>
        </div>
        <div>
          <dt>Expiration</dt>
          <dd>
            {cert.expiresAt ? new Intl.DateTimeFormat("fr-FR").format(cert.expiresAt) : "Aucune"}
          </dd>
        </div>
      </dl>
    </VerificationFrame>
  );
}
