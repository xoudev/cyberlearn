import Link from "next/link";
import React from "react";
import { ClaimCertificateButton } from "./claim-certificate";

interface BossNodeProps {
  pathSlug: string;
  pathTitle: string;
  /** An active quiz gates this path's certificate. */
  hasQuiz: boolean;
  /** All lessons of the path are complete (server-derived). */
  lessonsComplete: boolean;
  /** Path already COMPLETED (exam passed or claimed). */
  pathCompleted: boolean;
  /** Issued certificate id (download enabled), or null. */
  certificateId: string | null;
  doneLessons: number;
  totalLessons: number;
}

function Brackets(): React.JSX.Element {
  return (
    <>
      <span className="bk tl" />
      <span className="bk tr" />
      <span className="bk bl" />
      <span className="bk br" />
    </>
  );
}

const MedalIcon = (
  <svg
    width="46"
    height="46"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="9" r="5" />
    <path d="M7.5 13 L6 21.5 L12 18.5 L18 21.5 L16.5 13" />
  </svg>
);
const LockMark = (
  <svg
    width="11"
    height="11"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
    <path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7" />
  </svg>
);
const CheckMark = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8 L7 12 L13 4" />
  </svg>
);
const ArrowIcon = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8 H13 M9 4 L13 8 L9 12" />
  </svg>
);

/**
 * Final "boss" node: the v2 home for the certificate gate. Folds the former
 * certificate card + QuizPanel (exam gate) + ClaimCertificatePanel into one node
 * driven by the same props, preserving every state / link / action:
 *  - pathCompleted              → validated; download PDF when certificateId set
 *  - lessonsComplete + hasQuiz  → "Passer l'examen final →" (Link to /exam)
 *  - lessonsComplete + no quiz  → claim button (claimCertificateAction)
 *  - lessons incomplete         → locked + requirement chip (amber)
 */
export function BossNode({
  pathSlug,
  pathTitle,
  hasQuiz,
  lessonsComplete,
  pathCompleted,
  certificateId,
  doneLessons,
  totalLessons,
}: BossNodeProps): React.JSX.Element {
  const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const remaining = Math.max(0, totalLessons - doneLessons);
  const isUnlocked = pathCompleted || lessonsComplete;

  let eyebrow: string;
  let sub: string;
  let body: React.ReactNode;

  if (pathCompleted) {
    eyebrow = "// Récompense · débloquée";
    sub = "Tu as validé ce parcours. Ton certificat vérifiable est disponible.";
    body = certificateId ? (
      <a
        className="cp-boss__cta cp-boss__cta--teal"
        href={`/api/certificates/${certificateId}/download`}
      >
        Télécharger le PDF
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 2 V11 M4 7 L8 11 L12 7 M3 14 H13" />
        </svg>
      </a>
    ) : (
      <Link className="cp-boss__cta cp-boss__cta--teal" href="/certificates">
        Voir mes certificats {ArrowIcon}
      </Link>
    );
  } else if (lessonsComplete && hasQuiz) {
    eyebrow = "// Examen final · débloqué";
    sub = "Passe l'examen final chronométré pour valider le parcours et débloquer ton certificat.";
    body = (
      <Link className="cp-boss__cta" href={`/paths/${pathSlug}/exam`}>
        {"Passer l'examen final "}
        {ArrowIcon}
      </Link>
    );
  } else if (lessonsComplete) {
    eyebrow = "// Récompense · à réclamer";
    sub = "Tu as complété toutes les leçons de ce parcours. Récupère ton certificat vérifiable.";
    body = <ClaimCertificateButton pathSlug={pathSlug} />;
  } else {
    eyebrow = "// Récompense finale · certificat";
    sub = `Termine les ${String(totalLessons)} missions pour débloquer un certificat vérifiable, signé SHA-256 et partageable.`;
    body = (
      <div className="cp-boss__req">
        <span>
          <b>{doneLessons}</b> / {totalLessons} missions
        </span>
        <span className="mini-bar">
          <i style={{ width: `${String(pct)}%` }} />
        </span>
        <span>
          encore <b>{remaining}</b>
        </span>
      </div>
    );
  }

  return (
    <div className="cp-final">
      <div className="cp-cell cp-cell--empty" />
      <div className="cp-mid" />
      <div className="cp-cell cp-cell--empty" />
      <div className={`cp-boss${isUnlocked ? " is-unlocked" : ""}`}>
        <Brackets />
        <span className="cp-boss__connector" />
        <div className="cp-boss__eyebrow">{eyebrow}</div>
        <div className="cp-boss__medal">
          {MedalIcon}
          <span className="cp-boss__mark">{isUnlocked ? CheckMark : LockMark}</span>
        </div>
        <h3 className="cp-boss__title">Certificat {pathTitle}</h3>
        <p className="cp-boss__sub">{sub}</p>
        {body}
      </div>
    </div>
  );
}
