"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BadgeMedallion,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  toBadgeRarity,
} from "@cyberlearn/ui";

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

const CAT_COLOR: Record<string, string> = {
  CYBERSEC: "#FF4757",
  DEV: "#6E8BFF",
  NETWORK: "#0AFFD4",
};

// ── Badge card ────────────────────────────────────────────────────────────────

function ProfileBadgeCard({ badge }: { badge: SerializedBadge }) {
  const rarity = toBadgeRarity(badge.rarity);
  const v = BADGE_RARITY_VAR[rarity];

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
          background: `radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in oklab, ${v} 16%, transparent), transparent 70%)`,
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
          background: `linear-gradient(90deg, transparent, ${v}, transparent)`,
          boxShadow: `0 0 10px color-mix(in oklab, ${v} 60%, transparent)`,
        }}
        aria-hidden="true"
      />

      {/* Hex medallion - shared component (earned-only) */}
      <BadgeMedallion
        rarity={rarity}
        size="md"
        iconUrl={badge.iconUrl}
        name={badge.name}
        style={{ marginBottom: 18 }}
      />

      {/* Rarity label */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 9.5,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: v,
          marginBottom: 8,
        }}
      >
        · {BADGE_RARITY_LABELS[rarity]} ·
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
          overflowWrap: "anywhere",
          maxWidth: "100%",
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
          flexWrap: "wrap",
          rowGap: 8,
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
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
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
