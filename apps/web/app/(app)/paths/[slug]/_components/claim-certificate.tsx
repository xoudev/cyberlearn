"use client";

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { claimCertificateAction } from "../_actions/generate-certificate";

const TEAL = "#0AFFD4";

const card: React.CSSProperties = {
  position: "relative",
  padding: "22px 22px 24px",
  background: "rgba(5,4,26,0.55)",
  border: "1px solid rgba(10,255,212,0.25)",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: TEAL,
  marginBottom: 10,
};
const text: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "#B8B5D1",
  lineHeight: 1.6,
};

/**
 * Shown on a path that has NO active quiz once every lesson is complete: lets the
 * learner claim the certificate (the path completes via lessons, no exam gate).
 */
export function ClaimCertificatePanel({ pathSlug }: { pathSlug: string }): React.JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function claim(): void {
    setError(null);
    start(async () => {
      const res = await claimCertificateAction(pathSlug);
      if (!res.ok) {
        setError(res.error ?? "Échec.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div style={card}>
      <div style={eyebrow}>{"// Parcours terminé"}</div>
      <p style={text}>
        {"Tu as complété toutes les leçons de ce parcours. Récupère ton certificat vérifiable."}
      </p>
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          padding: "11px 20px",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#05041A",
          background: TEAL,
          border: "none",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Émission…" : "Obtenir mon certificat →"}
      </button>
      {error && (
        <p
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4D6D", marginTop: 10 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
