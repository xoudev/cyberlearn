"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SerializedBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: string;
  criterionType: string;
  earnedDateStr: string;
}

export interface SerializedLesson {
  lessonId: string;
  slug: string;
  title: string;
  category: string;
  xpReward: number;
  completedDateStr: string | null;
}

export interface SerializedCert {
  id: string;
  publicId: string;
  pathTitle: string;
  issuedDateStr: string;
  sha256Hash: string;
}

interface Props {
  badges: SerializedBadge[];
  lessons: SerializedLesson[];
  certs: SerializedCert[];
}

// ── Rarity tokens ─────────────────────────────────────────────────────────────

const HEX_CLIP = "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)";

interface RarityMeta {
  color: string;
  grad: string;
  glow: string;
}

const RARITY_META: Record<string, RarityMeta> = {
  LEGENDARY: {
    color: "#FFB547",
    grad: "linear-gradient(135deg, #FFB547, #FF4757)",
    glow: "rgba(255,181,71,0.18)",
  },
  EPIC: {
    color: "#0AFFD4",
    grad: "linear-gradient(135deg, #0AFFD4, #0024FF)",
    glow: "rgba(10,255,212,0.18)",
  },
  RARE: {
    color: "#6E8BFF",
    grad: "linear-gradient(135deg, #6E8BFF, #4A3FCC)",
    glow: "rgba(110,139,255,0.18)",
  },
  COMMON: {
    color: "#B8B5D1",
    grad: "linear-gradient(135deg, #B8B5D1, #6F6B99)",
    glow: "rgba(184,181,209,0.10)",
  },
};

const RARITY_META_DEFAULT: RarityMeta = {
  color: "#B8B5D1",
  grad: "linear-gradient(135deg, #B8B5D1, #6F6B99)",
  glow: "rgba(184,181,209,0.10)",
};

const CAT_COLOR: Record<string, string> = {
  CYBERSEC: "#FF4757",
  DEV: "#6E8BFF",
  NETWORK: "#0AFFD4",
};

// ── Badge icon fallback ───────────────────────────────────────────────────────

const CRITERION_PATHS: Record<string, string> = {
  LESSON_COMPLETED: "M4 4h8v1H4zm0 3h8v1H4zm0 3h5v1H4zM2 2h12v12H2V2zm1 1v10h10V3H3z",
  STREAK_DAYS:
    "M8 1C8 1 5 5.5 5 8a3 3 0 006 0c0-2.5-3-7-3-7zm0 3.5S9.5 6.5 9.5 8A1.5 1.5 0 016.5 8C6.5 6.5 8 4.5 8 4.5z",
  XP_THRESHOLD: "M8 1l1.9 4.1L14 6l-3 2.9.7 4.1L8 11l-3.7 2 .7-4.1L2 6l4.1-.9L8 1z",
  PATH_COMPLETED: "M2 8c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6-6-2.7-6-6zm9-1H8V4l-3 4h2.5v3L11 7z",
  CATEGORY_MASTERY: "M8 1l1.5 4.5H14l-3.8 2.7 1.4 4.3L8 9.8l-3.6 2.7 1.4-4.3L2 5.5h4.5L8 1z",
  PERFECT_QUIZ:
    "M8 2a6 6 0 100 12A6 6 0 008 2zm0 2a4 4 0 110 8A4 4 0 018 4zm0 2a2 2 0 100 4 2 2 0 000-4z",
};

function BadgeGlyph({
  criterionType,
  size = 36,
  color = "currentColor",
}: { criterionType: string; size?: number; color?: string }) {
  const d =
    CRITERION_PATHS[criterionType] ?? "M8 2a6 6 0 100 12A6 6 0 008 2zM7 6h2v4H7zm0 5h2v2H7z";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function BadgeImageWithFallback({
  src,
  alt,
  size,
  criterionType,
  color,
}: {
  src: string;
  alt: string;
  size: number;
  criterionType: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <BadgeGlyph criterionType={criterionType} size={size} color={color} />;
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

// ── Badge card ────────────────────────────────────────────────────────────────

function ProfileBadgeCard({ badge }: { badge: SerializedBadge }) {
  const r = RARITY_META[badge.rarity] ?? RARITY_META_DEFAULT;
  const rarityLabel =
    badge.rarity === "LEGENDARY"
      ? "Légendaire"
      : badge.rarity === "EPIC"
        ? "Épique"
        : badge.rarity === "RARE"
          ? "Rare"
          : "Commun";

  return (
    <article
      style={{
        position: "relative",
        padding: "24px 18px 22px",
        background: "rgba(10,8,38,0.5)",
        border: "1px solid #1F1B47",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Rarity glow bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${r.glow}, transparent 70%)`,
          opacity: 0.55,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Rarity strip */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${r.color}, transparent)`,
          boxShadow: `0 0 10px ${r.color}`,
        }}
        aria-hidden="true"
      />

      {/* Hex medallion */}
      <div
        style={{
          position: "relative",
          width: 88,
          height: 100,
          marginBottom: 18,
          display: "grid",
          placeItems: "center",
        }}
        aria-hidden="true"
      >
        {/* Gradient ring */}
        <div style={{ position: "absolute", inset: 0, background: r.grad, clipPath: HEX_CLIP }} />
        {/* Inner fill */}
        <div
          style={{ position: "absolute", inset: 2, background: "#0A0826", clipPath: HEX_CLIP }}
        />
        {/* Icon */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            color: r.color,
            filter: `drop-shadow(0 0 10px ${r.color})`,
          }}
        >
          <BadgeImageWithFallback
            src={badge.iconUrl}
            alt={badge.name}
            size={36}
            criterionType={badge.criterionType}
            color={r.color}
          />
        </div>
      </div>

      {/* Rarity label */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 9.5,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: r.color,
          marginBottom: 8,
        }}
      >
        · {rarityLabel} ·
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: 16,
          lineHeight: 1.15,
          color: "#F5F5FA",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        {badge.name}
      </h3>

      {/* Earned date */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "#3F3D5C",
          letterSpacing: "0.08em",
        }}
      >
        Obtenu · {badge.earnedDateStr}
      </div>
    </article>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ lessons }: { lessons: SerializedLesson[] }) {
  if (lessons.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#3F3D5C",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {"// Aucune activité pour l'instant"}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lessons.map((lp) => {
        const catColor = CAT_COLOR[lp.category] ?? "#6B6890";
        return (
          <Link key={lp.lessonId} href={`/lessons/${lp.slug}`} style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
                background: "rgba(10,8,38,0.5)",
                border: "1px solid #1F1B47",
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 32,
                  background: catColor,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${catColor}60`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#F5F5FA",
                    margin: "0 0 2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lp.title}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "#6B6890",
                    margin: 0,
                  }}
                >
                  {lp.category.toLowerCase()}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    fontSize: 12,
                    color: "#0AFFD4",
                  }}
                >
                  +{lp.xpReward} XP
                </span>
                {lp.completedDateStr && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "#3F3D5C",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {lp.completedDateStr}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Certificate section ───────────────────────────────────────────────────────

function CertsSection({ certs }: { certs: SerializedCert[] }) {
  if (certs.length === 0) {
    return (
      <div
        style={{
          marginTop: 48,
          paddingTop: 36,
          borderTop: "1px solid #1F1B47",
          textAlign: "center",
          padding: "60px 0",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#3F3D5C",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {"// Aucun certificat délivré pour l'instant"}
        </p>
      </div>
    );
  }

  const latest = certs[0];

  return (
    <section
      style={{
        marginTop: 48,
        paddingTop: 36,
        borderTop: "1px solid #1F1B47",
      }}
    >
      {/* Section head */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "-0.01em",
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "#3F3D5C",
              letterSpacing: "0.16em",
              marginRight: 12,
            }}
          >
            {"// CERT.PREVIEW"}
          </span>
          Dernier certificat délivré
        </h3>
        {certs.length > 1 && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#B8B5D1",
            }}
          >
            +{certs.length - 1} autre{certs.length > 2 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Certificate card */}
      {latest && (
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(200px, auto)",
            gap: 36,
            alignItems: "center",
            padding: "32px 36px",
            background:
              "linear-gradient(135deg, rgba(0,36,255,0.06), transparent 50%), rgba(5,4,26,0.6)",
            border: "1px solid #1F1B47",
          }}
        >
          {/* Corner brackets */}
          <span
            style={{
              position: "absolute",
              top: -1,
              left: -1,
              width: 16,
              height: 16,
              borderTop: "2px solid #0AFFD4",
              borderLeft: "2px solid #0AFFD4",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 16,
              height: 16,
              borderTop: "2px solid #0AFFD4",
              borderRight: "2px solid #0AFFD4",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              left: -1,
              width: 16,
              height: 16,
              borderBottom: "2px solid #0AFFD4",
              borderLeft: "2px solid #0AFFD4",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 16,
              height: 16,
              borderBottom: "2px solid #0AFFD4",
              borderRight: "2px solid #0AFFD4",
            }}
          />

          {/* Seal */}
          <div
            style={{
              position: "absolute",
              top: 24,
              right: 36,
              width: 64,
              height: 64,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(10,255,212,0.3)",
              borderRadius: "50%",
              fontFamily: "var(--font-mono)",
              fontSize: 8.5,
              letterSpacing: "0.2em",
              color: "#0AFFD4",
              opacity: 0.35,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            VERIFIED
          </div>

          {/* Body */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#0AFFD4",
                marginBottom: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 1,
                  background: "#0AFFD4",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              Parcours · validé
            </div>
            <h4
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 26,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "#F5F5FA",
                margin: "0 0 12px",
              }}
            >
              {latest.pathTitle}
            </h4>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 14,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#3F3D5C",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              <span>
                Délivré ·{" "}
                <b style={{ color: "#B8B5D1", fontWeight: 500 }}>{latest.issuedDateStr}</b>
              </span>
              <span style={{ color: "#1F1B47" }}>/</span>
              <span>
                ID · <b style={{ color: "#B8B5D1", fontWeight: 500 }}>{latest.id.slice(-12)}</b>
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                background: "#05041A",
                border: "1px solid #1F1B47",
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                maxWidth: "100%",
                letterSpacing: "0.02em",
                overflow: "hidden",
              }}
            >
              <span style={{ color: "#0AFFD4", flexShrink: 0 }}>SHA-256</span>
              <span
                style={{
                  color: "#B8B5D1",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {latest.sha256Hash}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "stretch",
              minWidth: 200,
            }}
          >
            <Link
              href={`/api/certificates/${latest.id}/download`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 18px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                background: "#0AFFD4",
                color: "#030219",
                border: "1px solid #0AFFD4",
                textDecoration: "none",
                boxShadow: "0 0 18px rgba(10,255,212,0.35)",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2 V11 M4 7 L8 11 L12 7 M2 14 H14" />
              </svg>
              Télécharger PDF
            </Link>
            <Link
              href={`/verify/${latest.publicId}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 14px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#B8B5D1",
                textDecoration: "none",
                border: "1px solid #2A2560",
                background: "transparent",
              }}
            >
              Vérifier →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Profile content (tabs) ────────────────────────────────────────────────────

export function ProfileContent({ badges, lessons, certs }: Props): React.JSX.Element {
  const [active, setActive] = useState<"activity" | "badges" | "certs">("badges");

  const tabs = [
    { id: "activity" as const, label: "Activité", count: lessons.length },
    { id: "badges" as const, label: "Badges", count: badges.length },
    { id: "certs" as const, label: "Certificats", count: certs.length },
  ];

  return (
    <div>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #1F1B47",
          marginBottom: 36,
        }}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActive(tab.id);
              }}
              style={{
                position: "relative",
                padding: "14px 22px",
                background: "transparent",
                border: 0,
                borderRadius: 0,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: isActive ? "#0AFFD4" : "#3F3D5C",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {tab.label}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  padding: "1px 6px",
                  border: `1px solid ${isActive ? "rgba(10,255,212,0.4)" : "#2A2560"}`,
                  color: isActive ? "#0AFFD4" : "#3F3D5C",
                }}
              >
                {tab.count}
              </span>
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -1,
                    height: 2,
                    background: "#0AFFD4",
                    boxShadow: "0 0 12px rgba(10,255,212,0.6)",
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}

        {/* Suffix */}
        <div
          style={{
            marginLeft: "auto",
            padding: "0 4px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "#3F3D5C",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>TRIER · RÉCENTS</span>
          <span style={{ color: "#1F1B47" }}>/</span>
          <span>
            VUE · <b style={{ color: "#F5F5FA" }}>GRILLE</b>
          </span>
        </div>
      </div>

      {/* Tab panels */}
      {active === "activity" && <ActivityFeed lessons={lessons} />}

      {active === "badges" &&
        (badges.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#3F3D5C",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {"// Aucun badge obtenu pour l'instant"}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {badges.map((b) => (
              <ProfileBadgeCard key={b.id} badge={b} />
            ))}
          </div>
        ))}

      {active === "certs" && <CertsSection certs={certs} />}
    </div>
  );
}
