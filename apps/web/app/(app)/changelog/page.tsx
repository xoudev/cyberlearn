import React from "react";
import type { Metadata } from "next";
import {
  CHANGELOG,
  CHANGE_META,
  LATEST_VERSION,
  type ChangelogEntry,
} from "@/lib/changelog/entries";
import { MarkChangelogSeen } from "./_components/mark-seen";

export const metadata: Metadata = { title: "Nouveautés · CyberLearn" };

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function EntryCard({
  entry,
  isLatest,
}: { entry: ChangelogEntry; isLatest: boolean }): React.ReactElement {
  return (
    <article style={{ position: "relative", paddingLeft: 34, paddingBottom: 40 }}>
      {/* timeline rail */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 6,
          top: 6,
          width: 11,
          height: 11,
          borderRadius: "50%",
          background: isLatest ? "var(--cosmetic-accent)" : "#0A0826",
          border: `2px solid ${isLatest ? "var(--cosmetic-accent)" : "#2A2560"}`,
          boxShadow: isLatest
            ? "0 0 12px color-mix(in srgb, var(--cosmetic-accent) 60%, transparent)"
            : "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 11,
          top: 20,
          bottom: 0,
          width: 1,
          background: "#1F1B47",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "#F5F5FA",
            padding: "4px 10px",
            border: `1px solid ${isLatest ? "color-mix(in srgb, var(--cosmetic-accent) 40%, transparent)" : "#2A2560"}`,
            background: isLatest
              ? "color-mix(in srgb, var(--cosmetic-accent) 6%, transparent)"
              : "rgba(10,8,38,0.6)",
          }}
        >
          v{entry.version}
        </span>
        {isLatest && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 9.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--cosmetic-accent)",
            }}
          >
            Dernière version
          </span>
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            letterSpacing: "0.04em",
            marginLeft: "auto",
          }}
        >
          {formatDate(entry.date)}
        </span>
      </div>

      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: "#F5F5FA",
          margin: "0 0 16px",
        }}
      >
        {entry.title}
      </h2>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {entry.changes.map((change, i) => {
          const meta = CHANGE_META[change.type];
          return (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 9.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: meta.color,
                  background: meta.bg,
                  border: `1px solid ${meta.color}40`,
                  padding: "3px 8px",
                  minWidth: 96,
                  textAlign: "center",
                }}
              >
                {meta.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  color: "#B8B5D1",
                }}
              >
                {change.text}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function ChangelogPage(): React.ReactElement {
  return (
    <div className="page-container">
      <MarkChangelogSeen version={LATEST_VERSION} />

      <header style={{ marginBottom: 40, maxWidth: 720 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--cosmetic-accent)",
            marginBottom: 14,
          }}
        >
          Système · Notes de version
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: "-0.03em",
            color: "#F5F5FA",
            margin: "0 0 12px",
          }}
        >
          Nouveautés
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            lineHeight: 1.6,
            color: "#8A87A8",
            margin: 0,
          }}
        >
          Chaque amélioration, nouveauté et correctif apporté à CyberLearn, de la version la plus
          récente à la plus ancienne.
        </p>
      </header>

      <div style={{ maxWidth: 720 }}>
        {CHANGELOG.map((entry, i) => (
          <EntryCard key={entry.version} entry={entry} isLatest={i === 0} />
        ))}
      </div>
    </div>
  );
}
