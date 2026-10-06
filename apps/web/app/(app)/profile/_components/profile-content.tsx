"use client";

import { Tabs } from "@/components/tabs";
import React, { useState } from "react";
import Link from "next/link";
import { BadgeCard } from "@/components/badge-card";
import type { SerializedBadge } from "@/lib/badges/collection";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  CYBERSEC: "var(--color-category-cybersec)",
  DEV: "var(--color-rarity-rare)",
  NETWORK: "var(--color-brand-turquoise)",
};

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ lessons }: { lessons: SerializedLesson[] }) {
  if (lessons.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
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
        const catColor = CAT_COLOR[lp.category] ?? "var(--color-text-muted)";
        return (
          <Link key={lp.lessonId} href={`/lessons/${lp.slug}`} style={{ textDecoration: "none" }}>
            <div
              className="card card--sunken"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 32,
                  background: catColor,
                  flexShrink: 0,
                  boxShadow: `0 0 8px color-mix(in srgb, ${catColor} 38%, transparent)`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--color-text-primary)",
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
                    color: "var(--color-text-muted)",
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
                    color: "var(--cosmetic-accent)",
                  }}
                >
                  +{lp.xpReward} XP
                </span>
                {lp.completedDateStr && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--color-text-muted)",
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
          borderTop: "1px solid var(--color-border-subtle)",
          textAlign: "center",
          padding: "60px 0",
        }}
      >
        <p
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
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
        borderTop: "1px solid var(--color-border-subtle)",
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
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
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
            className="mono-label"
            style={{
              color: "var(--color-text-secondary)",
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
            border: "1px solid var(--color-border-subtle)",
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
              borderTop: "2px solid var(--cosmetic-accent)",
              borderLeft: "2px solid var(--cosmetic-accent)",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 16,
              height: 16,
              borderTop: "2px solid var(--cosmetic-accent)",
              borderRight: "2px solid var(--cosmetic-accent)",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              left: -1,
              width: 16,
              height: 16,
              borderBottom: "2px solid var(--cosmetic-accent)",
              borderLeft: "2px solid var(--cosmetic-accent)",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 16,
              height: 16,
              borderBottom: "2px solid var(--cosmetic-accent)",
              borderRight: "2px solid var(--cosmetic-accent)",
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
              border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 30%, transparent)",
              borderRadius: "50%",
              fontFamily: "var(--font-mono)",
              fontSize: 8.5,
              letterSpacing: "0.2em",
              color: "var(--cosmetic-accent)",
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
              className="mono-label"
              style={{
                color: "var(--cosmetic-accent)",
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
                  background: "var(--cosmetic-accent)",
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
                color: "var(--color-text-primary)",
                margin: "0 0 12px",
              }}
            >
              {latest.pathTitle}
            </h4>
            <div
              className="mono-label"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 14,
                color: "var(--color-text-muted)",
                marginBottom: 14,
              }}
            >
              <span>
                Délivré ·{" "}
                <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {latest.issuedDateStr}
                </b>
              </span>
              <span style={{ color: "var(--color-border-subtle)" }}>/</span>
              <span>
                ID ·{" "}
                <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {latest.id.slice(-12)}
                </b>
              </span>
            </div>
            <div
              className="card card--sunken"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                maxWidth: "100%",
                letterSpacing: "0.02em",
                overflow: "hidden",
              }}
            >
              <span style={{ color: "var(--cosmetic-accent)", flexShrink: 0 }}>SHA-256</span>
              <span
                style={{
                  color: "var(--color-text-secondary)",
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
            <Link className="btn btn--accent" href={`/api/certificates/${latest.id}/download`}>
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
              className="mono-label card card--ghost"
              href={`/verify/${latest.publicId}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 14px",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                textDecoration: "none",
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
      <Tabs
        label="Sections du profil"
        items={tabs.map((tab) => ({ key: tab.id, label: tab.label, count: tab.count }))}
        value={active}
        onChange={setActive}
        trailing={
          <>
            <span>TRIER · RÉCENTS</span>
            <span style={{ color: "var(--color-border-subtle)" }}>/</span>
            <span>
              VUE · <b style={{ color: "var(--color-text-primary)" }}>GRILLE</b>
            </span>
          </>
        }
      />

      {/* Tab panels */}
      {active === "activity" && <ActivityFeed lessons={lessons} />}

      {active === "badges" &&
        (badges.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p
              className="mono-label"
              style={{
                color: "var(--color-text-muted)",
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
              <BadgeCard key={b.id} badge={b} />
            ))}
          </div>
        ))}

      {active === "certs" && <CertsSection certs={certs} />}
    </div>
  );
}
