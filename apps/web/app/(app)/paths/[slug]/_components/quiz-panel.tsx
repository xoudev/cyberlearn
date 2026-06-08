import Link from "next/link";
import React from "react";
import { ClaimCertificatePanel } from "./claim-certificate";

interface QuizPanelProps {
  pathSlug: string;
  /** An active quiz exists for this path. */
  hasQuiz: boolean;
  /** All lessons of the path are complete (server-derived). */
  lessonsComplete: boolean;
  /** Path already COMPLETED (exam already passed). */
  pathCompleted: boolean;
}

const TEAL = "#0AFFD4";

const card: React.CSSProperties = {
  position: "relative",
  padding: "22px 22px 24px",
  background: "rgba(5,4,26,0.55)",
  border: "1px solid #1F1B47",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: TEAL,
  marginBottom: 10,
};
const mono = (color: string): React.CSSProperties => ({
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color,
  lineHeight: 1.6,
});

/**
 * Slim status + entry point. The full exam flow (intro → questions → results,
 * with the chrono) lives on the dedicated page /paths/[slug]/exam.
 */
export function QuizPanel({
  pathSlug,
  hasQuiz,
  lessonsComplete,
  pathCompleted,
}: QuizPanelProps): React.JSX.Element | null {
  // No active quiz: the path completes via lessons. Once they're all done (and the
  // path isn't already completed), let the learner claim the certificate so a
  // 100%-complete, quiz-less path is never a dead-end. (Completed paths show the
  // certificate card elsewhere.)
  if (!hasQuiz) {
    if (!pathCompleted && lessonsComplete) {
      return <ClaimCertificatePanel pathSlug={pathSlug} />;
    }
    return null;
  }

  if (pathCompleted) {
    return (
      <div style={card}>
        <div style={eyebrow}>{"// Examen final · validé"}</div>
        <p style={mono("#B8B5D1")}>
          {"Tu as réussi l'examen final de ce parcours. Ton certificat est disponible."}
        </p>
      </div>
    );
  }

  if (!lessonsComplete) {
    return (
      <div style={{ ...card, borderColor: "#2A2560" }}>
        <div style={{ ...eyebrow, color: "#6B6890" }}>{"// Examen final · verrouillé"}</div>
        <p style={mono("#6B6890")}>
          {
            "Termine toutes les leçons du parcours pour débloquer l'examen final et obtenir ton certificat."
          }
        </p>
      </div>
    );
  }

  return (
    <div style={{ ...card, borderColor: "rgba(10,255,212,0.25)" }}>
      <div style={eyebrow}>{"// Examen final · débloqué"}</div>
      <p style={mono("#B8B5D1")}>
        {"Passe l'examen final chronométré pour valider le parcours et obtenir ton certificat."}
      </p>
      <Link
        href={`/paths/${pathSlug}/exam`}
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
          textDecoration: "none",
        }}
      >
        {"Passer l'examen final →"}
      </Link>
    </div>
  );
}
