import React from "react";
import { Users } from "lucide-react";

/**
 * The fourth cell of MISSION.BRIEF: what finishing the path earns.
 *
 * A catalogue path names its certificate, included until it is issued, then
 * available. A class path names what it is instead: it carries no certificate
 * (isCertifiablePath), and the cell used to promise one the server refused,
 * from the first visit to the last mission.
 */
export function BriefCertificate({
  certifiable,
  certObtained,
}: {
  certifiable: boolean;
  certObtained: boolean;
}): React.JSX.Element {
  if (!certifiable) {
    return (
      <div
        className="brief__cell brief__cell--cert"
        title="Un parcours construit pour ta classe : il ne délivre pas de certificat, ses leçons te rapportent leur XP."
      >
        <Users size={18} strokeWidth={1.6} aria-hidden="true" />
        <span>
          Parcours
          <br />
          de classe
        </span>
      </div>
    );
  }

  return (
    <div className="brief__cell brief__cell--cert">
      {certObtained ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 10.5 L8.5 15 L16 6" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="10" cy="8" r="4" />
          <path d="M7 11.5 L6 17 L10 15 L14 17 L13 11.5" />
        </svg>
      )}
      <span>
        Certificat
        <br />
        {certObtained ? "disponible" : "inclus"}
      </span>
    </div>
  );
}
