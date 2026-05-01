import React from "react";
import type { Metadata } from "next";
import { prisma } from "@cyberlearn/db";

export const metadata: Metadata = { title: "Badges" };

interface RarityStyle {
  color: string;
  bg: string;
  label: string;
}

const RARITY_DEFAULT: RarityStyle = {
  color: "#6B6890",
  bg: "rgba(42,37,96,0.3)",
  label: "Inconnu",
};
const RARITY_COLORS: Record<string, RarityStyle> = {
  COMMON: { color: "#B8B5D1", bg: "rgba(184,181,209,0.08)", label: "Commun" },
  UNCOMMON: { color: "#0AFFD4", bg: "rgba(10,255,212,0.1)", label: "Peu commun" },
  RARE: { color: "#4D8BFF", bg: "rgba(77,139,255,0.1)", label: "Rare" },
  EPIC: { color: "#B14DFF", bg: "rgba(177,77,255,0.1)", label: "Épique" },
  LEGENDARY: { color: "#FFB020", bg: "rgba(255,176,32,0.1)", label: "Légendaire" },
};

const CRITERION_LABEL: Record<string, string> = {
  LESSON_COMPLETED: "Leçon complétée",
  PATH_COMPLETED: "Parcours complété",
  XP_THRESHOLD: "Seuil XP",
  STREAK_DAYS: "Jours de streak",
  LESSON_COUNT: "Nombre de leçons",
  PERFECT_QUIZ: "Quiz parfait",
  FIRST_LOGIN: "Première connexion",
  MANUAL: "Manuel",
};

const BORDER = "#1F1B47";
const DANGER = "#FF4D6D";

const thStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#44406B",
  padding: "12px 16px",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: "middle",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

export default async function AdminBadgesPage(): Promise<React.ReactElement> {
  const badges = await prisma.badge.findMany({
    orderBy: [{ rarity: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      refCode: true,
      name: true,
      description: true,
      rarity: true,
      criterionType: true,
      xpReward: true,
      isActive: true,
      createdAt: true,
      _count: { select: { userBadges: true } },
    },
  });

  const activeCount = badges.filter((b) => b.isActive).length;
  const inactiveCount = badges.filter((b) => !b.isActive).length;

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
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
            <span style={{ width: 14, height: 1, background: DANGER, display: "inline-block" }} />
            Admin / Badges
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 24,
              fontWeight: 700,
              color: "#F5F5FA",
              margin: 0,
            }}
          >
            Badges ({String(badges.length)})
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              margin: "6px 0 0",
            }}
          >
            {String(activeCount)} actifs · {String(inactiveCount)} inactifs
          </p>
        </div>
      </div>

      {badges.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            border: `1px dashed ${BORDER}`,
            background: "rgba(5,4,26,0.4)",
          }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
            {"// aucun badge défini"}
          </p>
        </div>
      ) : (
        <div
          className="admin-table-wrap"
          style={{ background: "rgba(5,4,26,0.4)", border: `1px solid ${BORDER}` }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ ...thStyle, textAlign: "left" }}>Ref</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Nom</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Rareté</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Critère</th>
                <th style={{ ...thStyle, textAlign: "right" }}>XP</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Obtenus</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {badges.map((b) => {
                const rarity = RARITY_COLORS[b.rarity] ?? RARITY_DEFAULT;
                const crit = CRITERION_LABEL[b.criterionType] ?? b.criterionType;

                return (
                  <tr key={b.id} style={{ borderBottom: `1px solid rgba(31,27,71,0.4)` }}>
                    <td style={tdStyle}>
                      <span style={{ color: "#44406B" }}>{b.refCode}</span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 240 }}>
                      <div
                        style={{ fontWeight: 600, color: "#F5F5FA", fontSize: 13, marginBottom: 2 }}
                      >
                        {b.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#44406B",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 220,
                        }}
                      >
                        {b.description}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 10px",
                          background: rarity.bg,
                          border: `1px solid ${rarity.color}30`,
                          color: rarity.color,
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {rarity.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: "#6B6890" }}>{crit}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#0AFFD4" }}>
                        +{String(b.xpReward)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#B8B5D1" }}>
                        {String(b._count.userBadges)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {b.isActive ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "#0AFFD4",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "#0AFFD4",
                              flexShrink: 0,
                            }}
                          />
                          Actif
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "#44406B",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "#44406B",
                              flexShrink: 0,
                            }}
                          />
                          Inactif
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
