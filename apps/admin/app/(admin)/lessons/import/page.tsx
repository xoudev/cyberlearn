import React from "react";
import type { Metadata } from "next";
import { ImportClient } from "./_components/import-client";

export const metadata: Metadata = { title: "Importer une leçon MDX" };

export default function ImportLessonPage(): React.ReactElement {
  return (
    <div className="admin-page-content">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ width: 14, height: 1, background: "#FF4D6D", display: "inline-block" }} />
          Admin / Leçons / Import MDX
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          Importer une leçon MDX
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            margin: "6px 0 0",
          }}
        >
          Format: frontmatter YAML + corps MDX · Max 500 Ko · Extension .mdx uniquement
        </p>
      </div>

      <ImportClient />
    </div>
  );
}
