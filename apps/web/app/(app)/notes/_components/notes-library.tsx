"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Category } from "@cyberlearn/db";

export interface SerializedNote {
  id: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonCategory: Category;
  pathSlug: string | null;
  pathTitle: string | null;
  content: string;
  wordCount: number;
  updatedAt: string;
}

const CAT: Record<Category, { label: string; color: string }> = {
  CYBERSEC: { label: "Cybersec", color: "#FF4757" },
  DEV: { label: "Dev", color: "#6E8BFF" },
  NETWORK: { label: "Réseau", color: "#0AFFD4" },
};

const FILTERS: { key: "ALL" | Category; label: string }[] = [
  { key: "ALL", label: "Toutes" },
  { key: "CYBERSEC", label: "Cybersec" },
  { key: "DEV", label: "Dev" },
  { key: "NETWORK", label: "Réseau" },
];

const NO_PATH = "__none__";

/** Strip markdown to a short plain-text preview for the card. */
function excerpt(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#[\]()~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 150 ? `${text.slice(0, 149).trimEnd()}…` : text;
}

function timeAgo(iso: string, now: number | null): string {
  const then = new Date(iso).getTime();
  if (now === null) return new Date(iso).toLocaleDateString("fr-FR");
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${String(m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${String(h)} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${String(d)} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function NotesLibrary({ notes }: { notes: SerializedNote[] }): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | Category>("ALL");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (filter !== "ALL" && n.lessonCategory !== filter) return false;
      if (!q) return true;
      return (
        n.lessonTitle.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.pathTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notes, query, filter]);

  // Group by parcours (path). Preserve newest-first order inside each group.
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; notes: SerializedNote[] }>();
    for (const n of filtered) {
      const key = n.pathSlug ?? NO_PATH;
      const title = n.pathTitle ?? "Sans parcours";
      const g = map.get(key) ?? { title, notes: [] };
      g.notes.push(n);
      map.set(key, g);
    }
    return [...map.values()];
  }, [filtered]);

  const pathCount = new Set(notes.map((n) => n.pathSlug ?? NO_PATH)).size;

  return (
    <div
      className="page-container"
      style={{ maxWidth: 1180, margin: "0 auto", padding: "40px clamp(16px,4vw,48px)" }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--cosmetic-accent)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span aria-hidden="true" style={{ width: 24, height: 1, background: "#2A2560" }} />
        Cyber Learn · Apprentissage
      </div>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: "clamp(34px,5vw,52px)",
          letterSpacing: "-0.03em",
          color: "#F5F5FA",
          margin: "0 0 10px",
        }}
      >
        Bloc-<span style={{ color: "var(--cosmetic-accent)" }}>notes</span>
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 15,
          color: "#B8B5D1",
          maxWidth: 560,
          margin: "0 0 30px",
        }}
      >
        Prends des notes sans quitter la leçon, et retrouve-les regroupées par parcours ici.
      </p>

      {/* Search + filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 300px", minWidth: 0 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#6F6B99"
            strokeWidth={1.5}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3 3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="/ chercher dans mes notes..."
            aria-label="Chercher dans mes notes"
            style={{
              width: "100%",
              height: 44,
              padding: "0 14px 0 38px",
              background: "rgba(5,4,26,0.6)",
              border: "1px solid #2A2560",
              color: "#F5F5FA",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6F6B99",
          }}
        >
          <b style={{ color: "#F5F5FA" }}>{notes.length}</b> note{notes.length > 1 ? "s" : ""} ·{" "}
          <b style={{ color: "#F5F5FA" }}>{pathCount}</b> parcours
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const color = f.key === "ALL" ? "var(--cosmetic-accent)" : CAT[f.key].color;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "#05041A" : "#B8B5D1",
                  background: active ? color : "transparent",
                  border: `1px solid ${active ? color : "#2A2560"}`,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                {f.key !== "ALL" && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: active ? "#05041A" : color,
                    }}
                  />
                )}
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div
          style={{
            border: "1px dashed #2A2560",
            padding: "48px 24px",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "#6F6B99",
          }}
        >
          {notes.length === 0
            ? "Aucune note pour l'instant. Ouvre une leçon et note ce qui compte, ça apparaîtra ici."
            : "Aucune note ne correspond à ta recherche."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {groups.map((g) => (
            <section key={g.title}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#B8B5D1",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--cosmetic-accent)",
                  }}
                />
                {g.title}
                <span
                  style={{
                    fontSize: 10,
                    color: "#6F6B99",
                    border: "1px solid #2A2560",
                    padding: "2px 7px",
                  }}
                >
                  {g.notes.length} note{g.notes.length > 1 ? "s" : ""}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {g.notes.map((n) => {
                  const cat = CAT[n.lessonCategory];
                  return (
                    <Link
                      key={n.id}
                      href={`/lessons/${n.lessonSlug}`}
                      className="note-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        padding: 18,
                        background: "rgba(5,4,26,0.5)",
                        border: "1px solid #1F1B47",
                        borderLeft: `3px solid ${cat.color}`,
                        textDecoration: "none",
                        minHeight: 150,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          fontFamily: "var(--font-mono)",
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: cat.color,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: cat.color,
                          }}
                        />
                        {cat.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#F5F5FA",
                          lineHeight: 1.25,
                        }}
                      >
                        {n.lessonTitle}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontFamily: "var(--font-body)",
                          fontSize: 13,
                          color: "#8B88A8",
                          lineHeight: 1.5,
                        }}
                      >
                        {excerpt(n.content) || "Note vide"}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10.5,
                          color: "#6F6B99",
                          borderTop: "1px solid #1F1B47",
                          paddingTop: 10,
                        }}
                      >
                        <span suppressHydrationWarning>{timeAgo(n.updatedAt, now)}</span>
                        <span>
                          {n.wordCount} mot{n.wordCount > 1 ? "s" : ""}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
