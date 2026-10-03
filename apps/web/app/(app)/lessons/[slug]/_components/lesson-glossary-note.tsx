import Link from "next/link";
import React from "react";

/**
 * Says, in the lesson's side column, what the dotted underlines are, and leads
 * to the page that lists every term (see rehypeGlossary).
 */
export function LessonGlossaryNote(): React.ReactElement {
  return (
    <div style={{ padding: "10px 12px", display: "grid", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#7F7BA9",
        }}
      >
        Glossaire
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: "#B8B5D1" }}>
        Un mot souligné en{" "}
        <span
          style={{
            textDecoration: "underline dotted",
            textDecorationColor: "var(--cosmetic-accent, #0AFFD4)",
            textUnderlineOffset: 3,
          }}
        >
          pointillés
        </span>{" "}
        a sa définition au survol.
      </span>
      <Link
        href="/glossaire"
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12,
          color: "var(--cosmetic-accent, #0AFFD4)",
          textDecoration: "none",
        }}
      >
        Tous les termes →
      </Link>
    </div>
  );
}
