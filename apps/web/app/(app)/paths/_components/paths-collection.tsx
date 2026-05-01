"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SerializedPath {
  id: string;
  slug: string;
  refCode: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  xpTotal: number;
  lessonCount: number;
  hasCert: boolean;
  status: "idle" | "inprog" | "done";
  progressDone: number;
  progressTotal: number;
}

interface Props {
  paths: SerializedPath[];
  inProgCount: number;
  doneCount: number;
  totalXp: number;
  totalHours: number;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  string,
  { label: string; color: string; kind: "cyber" | "dev" | "net" }
> = {
  CYBERSEC: { label: "Cybersec", color: "#FF4757", kind: "cyber" },
  DEV: { label: "Dev", color: "#6E8BFF", kind: "dev" },
  NETWORK: { label: "Réseau", color: "#0AFFD4", kind: "net" },
};

const DIFF_META: Record<string, { label: string; level: 1 | 2 | 3; color: string }> = {
  BEGINNER: { label: "Débutant", level: 1, color: "#0AFFD4" },
  INTERMEDIATE: { label: "Intermédiaire", level: 2, color: "#6E8BFF" },
  ADVANCED: { label: "Avancé", level: 3, color: "#FF4757" },
};

const CATEGORY_DEFAULT = { label: "?", color: "#B8B5D1", kind: "cyber" as const };
const DIFF_DEFAULT = { label: "?", level: 1 as const, color: "#B8B5D1" };

// ── Sub-components ────────────────────────────────────────────────────────────

function KindIcon({ kind, size = 70 }: { kind: "cyber" | "dev" | "net"; size?: number }) {
  const s: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (kind === "cyber")
    return (
      <svg {...s}>
        <path d="M32 6 L52 14 V32 C52 44 42 52 32 58 C22 52 12 44 12 32 V14 Z" />
        <path d="M24 32 L30 38 L42 24" />
      </svg>
    );
  if (kind === "dev")
    return (
      <svg {...s}>
        <path d="M22 20 L8 32 L22 44" />
        <path d="M42 20 L56 32 L42 44" />
        <path d="M36 14 L28 50" />
      </svg>
    );
  return (
    <svg {...s}>
      <circle cx="32" cy="14" r="4" />
      <circle cx="14" cy="48" r="4" />
      <circle cx="50" cy="48" r="4" />
      <path d="M32 18 L14 44 M32 18 L50 44 M18 48 L46 48" />
    </svg>
  );
}

function DiffBars({ level, color }: { level: 1 | 2 | 3; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {([1, 2, 3] as const).map((i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 7,
            background: i <= level ? color : "#3F3D5C",
          }}
        />
      ))}
    </span>
  );
}

function PathCard({ path }: { path: SerializedPath }) {
  const cat = CATEGORY_META[path.category] ?? CATEGORY_DEFAULT;
  const diff = DIFF_META[path.difficulty] ?? DIFF_DEFAULT;
  const pct =
    path.progressTotal > 0 ? Math.round((path.progressDone / path.progressTotal) * 100) : 0;

  const cardBorder =
    path.status === "inprog"
      ? "rgba(10,255,212,0.4)"
      : path.status === "done"
        ? "rgba(10,255,212,0.35)"
        : "#1F1B47";

  const cardShadow =
    path.status === "inprog"
      ? "0 0 0 1px rgba(10,255,212,0.16), 0 0 28px rgba(10,255,212,0.07), inset 3px 0 0 #0AFFD4"
      : path.status === "done"
        ? "0 0 0 1px rgba(10,255,212,0.12)"
        : "none";

  return (
    <article
      style={{
        position: "relative",
        background:
          path.status === "done"
            ? "linear-gradient(135deg, rgba(10,255,212,0.06), transparent 60%), #0A0826"
            : "#0A0826",
        border: `1px solid ${cardBorder}`,
        boxShadow: cardShadow,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "border-color 200ms ease, transform 200ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        if (path.status === "idle") (e.currentTarget as HTMLElement).style.borderColor = "#2A2560";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        if (path.status === "idle") (e.currentTarget as HTMLElement).style.borderColor = cardBorder;
      }}
    >
      {/* Cover */}
      <div
        style={{
          position: "relative",
          height: 168,
          background: "#05041A",
          borderBottom: "1px solid #1F1B47",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {/* Grid texture */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(42,37,96,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,37,96,0.5) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
          }}
        />
        {/* Radial color glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 70% 80% at 50% 50%, ${cat.color}33, transparent 70%)`,
          }}
        />
        {/* Scan lines */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent 3px, rgba(10,255,212,0.04) 3px, rgba(10,255,212,0.04) 4px)",
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }}
        />
        {/* Kind icon */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            color: cat.color,
            filter: `drop-shadow(0 0 16px ${cat.color})`,
          }}
        >
          <KindIcon kind={cat.kind} size={70} />
        </div>
        {/* Category badge */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 3,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 9.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: cat.color,
            background: "rgba(3,2,25,0.85)",
            border: `1px solid ${cat.color}66`,
            padding: "4px 9px",
          }}
        >
          {cat.label}
        </div>
        {/* Difficulty / certified badge */}
        {path.status === "done" ? (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 3,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#030219",
              background: "#0AFFD4",
              padding: "5px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 0 18px rgba(10,255,212,0.5)",
              clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
            }}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8 L7 12 L13 4" />
            </svg>
            Certifié
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 3,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 9.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#B8B5D1",
              background: "rgba(3,2,25,0.85)",
              border: "1px solid #2A2560",
              padding: "4px 9px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <DiffBars level={diff.level} color={diff.color} />
            {diff.label}
          </div>
        )}
        {/* Ref code */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 12,
            zIndex: 3,
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            color: "#3F3D5C",
            letterSpacing: "0.14em",
          }}
        >
          // <b style={{ color: cat.color, fontWeight: 700 }}>{path.refCode}</b>
        </div>
        {/* Cert icon */}
        {path.hasCert && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 12,
              zIndex: 3,
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#0AFFD4",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px #0AFFD4)" }}
            >
              <circle cx="8" cy="6" r="3" />
              <path d="M5.5 8.5 L4.5 14 L8 12 L11.5 14 L10.5 8.5" />
            </svg>
            Certificat
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          padding: "22px 22px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1.18,
            letterSpacing: "-0.02em",
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          {path.title}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "#B8B5D1",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {path.description}
        </p>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "#6B6890",
            textTransform: "uppercase",
            paddingTop: 8,
          }}
        >
          <span>
            <b style={{ color: "#F5F5FA", fontWeight: 700 }}>{path.lessonCount}</b> missions
          </span>
          <span style={{ color: "#44406B" }}>·</span>
          <span>
            <b style={{ color: "#F5F5FA", fontWeight: 700 }}>~{path.estimatedHours}h</b>
          </span>
          <span style={{ color: "#44406B" }}>·</span>
          <span style={{ color: "#0AFFD4", fontWeight: 700, letterSpacing: "0.1em" }}>
            +{path.xpTotal.toLocaleString("fr-FR")} XP
          </span>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 4 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6B6890",
              marginBottom: 6,
            }}
          >
            <span>
              {path.status === "idle" && "Non commencé"}
              {path.status === "inprog" && (
                <>
                  <b style={{ color: "#F5F5FA", fontWeight: 700 }}>{path.progressDone}</b> /{" "}
                  {path.progressTotal} missions
                </>
              )}
              {path.status === "done" && (
                <b style={{ color: "#F5F5FA", fontWeight: 700 }}>Parcours complété</b>
              )}
            </span>
            <span style={{ color: "#0AFFD4", fontWeight: 700 }}>{pct}%</span>
          </div>
          <div
            style={{
              position: "relative",
              height: 3,
              background: "#05041A",
              borderTop: "1px solid #1F1B47",
              borderBottom: "1px solid #1F1B47",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                background:
                  path.status === "done" ? "#0AFFD4" : "linear-gradient(90deg, #0024FF, #0AFFD4)",
                boxShadow: "0 0 10px rgba(10,255,212,0.5)",
                transition: "width 600ms ease-out",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", gap: 8, padding: "0 22px 22px" }}>
        {path.status === "done" ? (
          <Link
            href={`/paths/${path.slug}`}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "11px 18px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid rgba(10,255,212,0.4)",
              color: "#0AFFD4",
              textDecoration: "none",
              transition: "border-color 180ms ease, background 180ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(10,255,212,0.06)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "#0AFFD4";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(10,255,212,0.4)";
            }}
          >
            Voir le certificat
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8 H13 M9 4 L13 8 L9 12" />
            </svg>
          </Link>
        ) : (
          <Link
            href={`/paths/${path.slug}`}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "11px 18px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              background: "#0024FF",
              border: "1px solid #0024FF",
              color: "#fff",
              textDecoration: "none",
              boxShadow: "0 0 18px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)",
              transition: "background 180ms ease, box-shadow 180ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#1F3BFF";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 26px rgba(0,36,255,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#0024FF";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 18px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)";
            }}
          >
            {path.status === "inprog" ? "Continuer" : "Commencer"}
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8 H13 M9 4 L13 8 L9 12" />
            </svg>
          </Link>
        )}
        <Link
          href={`/paths/${path.slug}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "11px 18px",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            background: "transparent",
            border: "1px solid #1F1B47",
            color: "#B8B5D1",
            textDecoration: "none",
            transition: "border-color 180ms ease, color 180ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2A2560";
            (e.currentTarget as HTMLAnchorElement).style.color = "#F5F5FA";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "#1F1B47";
            (e.currentTarget as HTMLAnchorElement).style.color = "#B8B5D1";
          }}
        >
          Aperçu
        </Link>
      </div>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Filter = "all" | "CYBERSEC" | "DEV" | "NETWORK";

export function PathsCollection({
  paths,
  inProgCount,
  doneCount,
  totalXp,
  totalHours,
}: Props): React.ReactElement {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = filter === "all" ? paths : paths.filter((p) => p.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [paths, filter, search]);

  const idleCount = paths.length - inProgCount - doneCount;

  const pillStyle = (active: boolean, color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 34,
    padding: "0 16px",
    background: active ? `${color}0F` : "transparent",
    border: `1px solid ${active ? color : "#1F1B47"}`,
    color: active ? color : "#B8B5D1",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: 0,
    boxShadow: active ? `0 0 0 1px ${color}33, 0 0 18px ${color}29` : "none",
    transition: "all 180ms ease",
  });

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.04em",
          color: "#6B6890",
          marginBottom: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "#0AFFD4" }}>$</span>
        <span>~/</span>
        <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
        <span style={{ color: "#44406B" }}>/</span>
        <span style={{ color: "#F5F5FA", fontWeight: 500 }}>parcours</span>
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 13,
            background: "#0AFFD4",
            boxShadow: "0 0 8px #0AFFD4",
            marginLeft: 4,
            verticalAlign: "-2px",
            animation: "blink 1s step-end infinite",
          }}
        />
      </div>

      {/* Header */}
      <div className="catalog-header-grid">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(40px, 5.2vw, 72px)",
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#F5F5FA",
              margin: "0 0 14px",
            }}
          >
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {paths.length}
            </em>{" "}
            parcours disponibles
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.55,
              color: "#B8B5D1",
              margin: 0,
              maxWidth: 540,
            }}
          >
            Chaque parcours mène d&apos;une compétence brute à un certificat vérifiable.
          </p>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}
        >
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <span>
              <b style={{ color: "#0AFFD4" }}>{inProgCount}</b> en cours
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "#FFB547" }}>{doneCount}</b> certifié
            </span>
            <span style={{ color: "#44406B" }}>/</span>
            <span>
              <b style={{ color: "#F5F5FA" }}>{idleCount}</b> à découvrir
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            + <b style={{ color: "#F5F5FA" }}>{totalHours}</b> heures de contenu ·{" "}
            <b style={{ color: "#F5F5FA" }}>{totalXp.toLocaleString("fr-FR")}</b> XP total
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ alignItems: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
            marginRight: 4,
          }}
        >
          › DOMAINE
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {(
            [
              { id: "all", label: "Tous", color: "#B8B5D1" },
              { id: "CYBERSEC", label: "Cybersec", color: "#FF4757" },
              { id: "DEV", label: "Dev", color: "#6E8BFF" },
              { id: "NETWORK", label: "Réseau", color: "#0AFFD4" },
            ] as const
          ).map(({ id, label, color }) => (
            <button key={id} onClick={() => setFilter(id)} style={pillStyle(filter === id, color)}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  background: color,
                  transform: "rotate(45deg)",
                  boxShadow: filter === id ? `0 0 6px ${color}` : "none",
                  flexShrink: 0,
                }}
              />
              {label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <span style={{ width: 1, height: 20, background: "#1F1B47", margin: "0 6px" }} />

        {/* Search */}
        <label
          style={{
            marginLeft: "auto",
            position: "relative",
            height: 34,
            minWidth: 220,
            display: "block",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6B6890",
            }}
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="/ chercher un parcours..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: "100%",
              padding: "0 12px 0 36px",
              background: "#05041A",
              border: "1px solid #1F1B47",
              color: "#F5F5FA",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              outline: "none",
              borderRadius: 0,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0AFFD4";
              e.currentTarget.style.boxShadow = "0 0 0 1px rgba(10,255,212,0.3)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#1F1B47";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </label>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 320,
            gap: 16,
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3F3D5C"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21 l-4.35-4.35" />
          </svg>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "#6B6890",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            Aucun parcours trouvé
          </p>
        </div>
      ) : (
        <div className="grid-2-col">
          {filtered.map((path) => (
            <PathCard key={path.id} path={path} />
          ))}
        </div>
      )}
    </div>
  );
}
